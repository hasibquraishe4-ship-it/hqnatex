import io
import re
import warnings
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from django.http import FileResponse, Http404
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.audit.models import AuditLog


def private_storage():
    root = Path(
        getattr(settings, "HQNATEX_PRIVATE_DOCUMENT_ROOT",
                Path(settings.BASE_DIR) / "private_workspace")
    ).resolve()
    public_roots = [
        Path(settings.BASE_DIR) / "frontend",
        Path(settings.BASE_DIR).parent / "frontend",
    ]
    for key in ("MEDIA_ROOT", "STATIC_ROOT"):
        value = getattr(settings, key, None)
        if value:
            public_roots.append(Path(value))
    for public in public_roots:
        public = public.resolve()
        if root == public or public in root.parents:
            raise RuntimeError("Private document root overlaps a public directory.")
    return FileSystemStorage(
        location=root, base_url=None,
        file_permissions_mode=0o600,
        directory_permissions_mode=0o700,
    )


def validate_upload(upload):
    limit = 10 * 1024 * 1024
    raw = upload.read(limit + 1)
    if not raw:
        raise serializers.ValidationError({"file": "File is empty."})
    if len(raw) > limit:
        raise serializers.ValidationError({"file": "Maximum file size is 10 MB."})

    suffix = Path(upload.name).suffix.lower()
    if suffix == ".pdf":
        if not raw.startswith(b"%PDF-"):
            raise serializers.ValidationError({"file": "Invalid PDF signature."})
        return raw, ".pdf", "application/pdf"

    allowed = {
        ".jpg": ("JPEG", "image/jpeg"),
        ".jpeg": ("JPEG", "image/jpeg"),
        ".png": ("PNG", "image/png"),
        ".webp": ("WEBP", "image/webp"),
    }
    if suffix not in allowed:
        raise serializers.ValidationError({
            "file": "Supported formats: PDF, JPG, PNG, WebP."
        })
    expected, content_type = allowed[suffix]
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as img:
                if img.format != expected:
                    raise ValueError("Image format mismatch.")
                if img.width * img.height > 25_000_000:
                    raise ValueError("Image dimensions exceed limit.")
                img.verify()
    except (UnidentifiedImageError, OSError, ValueError,
            Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise serializers.ValidationError({"file": "Invalid or oversized image."})
    return raw, suffix, content_type


def document_file(storage, obj):
    prefix = f"{obj.tenant_id}/{obj.company_id}/{obj.pk}/"
    key = obj.storage_key
    if not key or not key.startswith(prefix):
        raise Http404("Document file not found.")
    if not re.fullmatch(
        re.escape(prefix) + r"[0-9a-f]{32}\.(pdf|jpg|jpeg|png|webp)", key
    ):
        raise Http404("Invalid document file key.")
    path = Path(storage.path(key)).resolve()
    root = Path(storage.location).resolve()
    if root not in path.parents or not path.is_file():
        raise Http404("Document file not found.")
    return path


class DocumentFileActions:
    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request, pk=None):
        if set(request.data.keys()) != {"file"} or len(request.FILES.getlist("file")) != 1:
            raise serializers.ValidationError({"file": "Send exactly one file."})
        # بررسی دسترسی قبل از خواندن فایل.
        obj = self.get_object()
        raw, suffix, content_type = validate_upload(request.FILES["file"])
        storage = private_storage()
        saved = None
        try:
            with transaction.atomic():
                obj = self.get_queryset().select_for_update(of=("self",)).get(pk=obj.pk)
                if obj.status == "archived":
                    raise serializers.ValidationError("Archived document cannot be replaced.")
                key = f"{obj.tenant_id}/{obj.company_id}/{obj.pk}/{uuid4().hex}{suffix}"
                saved = storage.save(key, ContentFile(raw))
                obj.storage_key = saved
                name = request.FILES["file"].name.replace("\\", "/").split("/")[-1]
                obj.original_name = "".join(
                    char for char in name if ord(char) >= 32 and ord(char) != 127
                )[:255] or ("document" + suffix)
                obj.content_type = content_type
                obj.size_bytes = len(raw)
                obj.uploaded_by = request.user
                obj.save(update_fields=[
                    "storage_key", "original_name", "content_type",
                    "size_bytes", "uploaded_by", "updated_at",
                ])
                AuditLog.objects.create(
                    tenant_id=request.tenant_id,
                    actor=request.user,
                    action="workspace_document_upload",
                    object_type=obj._meta.label_lower,
                    object_id=obj.pk,
                    metadata={
                        "company_id": str(request.company_id),
                        "size_bytes": obj.size_bytes,
                    },
                )
        except Exception:
            if saved:
                storage.delete(saved)
            raise
        # فایل قبلی فعلاً نگهداری می‌شود؛ پاکسازی جداگانه انجام خواهد شد.
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        obj = self.get_object()
        path = document_file(private_storage(), obj)
        AuditLog.objects.create(
            tenant_id=request.tenant_id,
            actor=request.user,
            action="workspace_document_download",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"company_id": str(request.company_id)},
        )
        response = FileResponse(
            path.open("rb"),
            as_attachment=True,
            filename=obj.original_name or "document",
            content_type="application/octet-stream",
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
