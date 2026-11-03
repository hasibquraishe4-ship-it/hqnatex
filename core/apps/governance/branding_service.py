from __future__ import annotations

import hashlib
import uuid
from io import BytesIO
from pathlib import PurePosixPath
from typing import Any

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditLog
from apps.governance.models import Setting, SettingHistory


BACKGROUND_SETTING_KEY = "appearance.system_background"

BACKGROUND_PERMISSION_VIEW = "settings.appearance.view"
BACKGROUND_PERMISSION_MANAGE = "settings.appearance.manage"

MODE_DEFAULT = "default"
MODE_CUSTOM = "custom"
MODE_NONE = "none"

VALID_MODES = {
    MODE_DEFAULT,
    MODE_CUSTOM,
    MODE_NONE,
}

FORMAT_TO_EXTENSION = {
    "PNG": "png",
    "JPEG": "jpg",
    "WEBP": "webp",
}

FORMAT_TO_CONTENT_TYPE = {
    "PNG": "image/png",
    "JPEG": "image/jpeg",
    "WEBP": "image/webp",
}


def _actor_id(user) -> uuid.UUID | None:
    value = getattr(user, "pk", None)

    if value is None:
        return None

    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def default_visual_options() -> dict[str, Any]:
    return {
        "position":
            settings.HQNATEX_BACKGROUND_DEFAULT_POSITION,

        "size":
            settings.HQNATEX_BACKGROUND_DEFAULT_SIZE,

        "dark_overlay_opacity":
            float(
                settings
                .HQNATEX_BACKGROUND_DEFAULT_DARK_OVERLAY
            ),

        "light_overlay_opacity":
            float(
                settings
                .HQNATEX_BACKGROUND_DEFAULT_LIGHT_OVERLAY
            ),
    }


def default_background_value() -> dict[str, Any]:
    return {
        "mode": MODE_DEFAULT,
        **default_visual_options(),
    }


def _setting_queryset(
    *,
    tenant_id,
    company_id,
):
    return (
        Setting.objects
        .filter(
            tenant_id=tenant_id,
            company_id=company_id,
            branch__isnull=True,
            agency__isnull=True,
            scope_type="company",
            key=BACKGROUND_SETTING_KEY,
            status="active",
        )
        .order_by(
            "-effective_from",
            "-updated_at",
        )
    )


def get_background_setting(
    *,
    tenant_id,
    company_id,
) -> Setting | None:
    return (
        _setting_queryset(
            tenant_id=tenant_id,
            company_id=company_id,
        )
        .first()
    )


def resolved_value(
    setting: Setting | None,
) -> dict[str, Any]:

    base = default_background_value()

    if setting is None:
        return base

    raw = setting.value

    if not isinstance(raw, dict):
        return base

    result = {
        **base,
        **raw,
    }

    if result.get("mode") not in VALID_MODES:
        result["mode"] = MODE_DEFAULT

    return result


def serialize_background(
    *,
    setting: Setting | None,
) -> dict[str, Any]:

    value = resolved_value(
        setting,
    )

    mode = value.get(
        "mode",
        MODE_DEFAULT,
    )

    if mode == MODE_CUSTOM and value.get(
        "storage_key"
    ):
        background_url = (
            "/api/v1/settings/branding/background/file"
        )

    elif mode == MODE_NONE:
        background_url = None

    else:
        background_url = (
            settings.HQNATEX_BACKGROUND_DEFAULT_URL
        )

    return {
        "key":
            BACKGROUND_SETTING_KEY,

        "mode":
            mode,

        "background_url":
            background_url,

        "is_custom":
            mode == MODE_CUSTOM,

        "uses_default":
            mode == MODE_DEFAULT,

        "position":
            value.get(
                "position",
                settings
                .HQNATEX_BACKGROUND_DEFAULT_POSITION,
            ),

        "size":
            value.get(
                "size",
                settings
                .HQNATEX_BACKGROUND_DEFAULT_SIZE,
            ),

        "dark_overlay_opacity":
            value.get(
                "dark_overlay_opacity",
                settings
                .HQNATEX_BACKGROUND_DEFAULT_DARK_OVERLAY,
            ),

        "light_overlay_opacity":
            value.get(
                "light_overlay_opacity",
                settings
                .HQNATEX_BACKGROUND_DEFAULT_LIGHT_OVERLAY,
            ),

        "content_type":
            value.get(
                "content_type"
            ),

        "size_bytes":
            value.get(
                "size_bytes"
            ),

        "width":
            value.get(
                "width"
            ),

        "height":
            value.get(
                "height"
            ),

        "sha256":
            value.get(
                "sha256"
            ),

        "updated_at":
            (
                setting.updated_at.isoformat()
                if setting is not None
                else None
            ),
    }


def _parse_float(
    value,
    *,
    field_name: str,
) -> float:

    try:
        parsed = float(value)

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValidationError(
            {
                field_name:
                    "Must be a number."
            }
        ) from exc

    if parsed < 0 or parsed > 1:
        raise ValidationError(
            {
                field_name:
                    "Must be between 0 and 1."
            }
        )

    return parsed


def normalize_visual_options(
    data,
    *,
    current: dict[str, Any] | None = None,
) -> dict[str, Any]:

    visual_keys = set(
        default_visual_options().keys()
    )

    result = {
        **default_visual_options(),
        **(
            {
                k: current[k]
                for k in visual_keys
                if k in current
            }
            if isinstance(
                current,
                dict,
            )
            else {}
        ),
    }

    if "position" in data:

        position = str(
            data.get(
                "position"
            )
        ).strip()

        if position not in (
            settings
            .HQNATEX_BACKGROUND_ALLOWED_POSITIONS
        ):
            raise ValidationError(
                {
                    "position":
                        "Unsupported background position."
                }
            )

        result["position"] = position

    if "size" in data:

        size = str(
            data.get(
                "size"
            )
        ).strip()

        if size not in (
            settings
            .HQNATEX_BACKGROUND_ALLOWED_SIZES
        ):
            raise ValidationError(
                {
                    "size":
                        "Unsupported background size."
                }
            )

        result["size"] = size

    if "dark_overlay_opacity" in data:
        result[
            "dark_overlay_opacity"
        ] = _parse_float(
            data.get(
                "dark_overlay_opacity"
            ),
            field_name=(
                "dark_overlay_opacity"
            ),
        )

    if "light_overlay_opacity" in data:
        result[
            "light_overlay_opacity"
        ] = _parse_float(
            data.get(
                "light_overlay_opacity"
            ),
            field_name=(
                "light_overlay_opacity"
            ),
        )

    return result


def validate_background_image(
    upload,
) -> dict[str, Any]:

    max_bytes = int(
        settings
        .HQNATEX_BACKGROUND_MAX_BYTES
    )

    raw = upload.read(
        max_bytes + 1
    )

    if not raw:
        raise ValidationError(
            {
                "background":
                    "Image file is empty."
            }
        )

    if len(raw) > max_bytes:
        raise ValidationError(
            {
                "background":
                    "Image file exceeds configured size limit."
            }
        )

    try:

        with Image.open(
            BytesIO(raw)
        ) as probe:

            probe.verify()

        with Image.open(
            BytesIO(raw)
        ) as image:

            image_format = str(
                image.format or ""
            ).upper()

            width, height = image.size

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as exc:

        raise ValidationError(
            {
                "background":
                    "Uploaded file is not a valid image."
            }
        ) from exc

    allowed_formats = {
        str(item).upper()
        for item
        in settings
        .HQNATEX_BACKGROUND_ALLOWED_FORMATS
    }

    if image_format not in allowed_formats:

        raise ValidationError(
            {
                "background":
                    "Unsupported image format."
            }
        )

    if image_format not in FORMAT_TO_EXTENSION:

        raise ValidationError(
            {
                "background":
                    "Image format has no safe storage mapping."
            }
        )

    max_width = int(
        settings
        .HQNATEX_BACKGROUND_MAX_WIDTH
    )

    max_height = int(
        settings
        .HQNATEX_BACKGROUND_MAX_HEIGHT
    )

    if width > max_width or height > max_height:

        raise ValidationError(
            {
                "background":
                    "Image dimensions exceed configured limits."
            }
        )

    return {
        "raw":
            raw,

        "format":
            image_format,

        "extension":
            FORMAT_TO_EXTENSION[
                image_format
            ],

        "content_type":
            FORMAT_TO_CONTENT_TYPE[
                image_format
            ],

        "size_bytes":
            len(raw),

        "width":
            width,

        "height":
            height,

        "sha256":
            hashlib.sha256(
                raw
            ).hexdigest(),
    }


def _storage_prefix(
    *,
    tenant_id,
    company_id,
) -> str:
    return (
        "branding/backgrounds/"
        f"{tenant_id}/"
        f"{company_id}/"
    )


def _new_storage_key(
    *,
    tenant_id,
    company_id,
    extension: str,
) -> str:
    return (
        _storage_prefix(
            tenant_id=tenant_id,
            company_id=company_id,
        )
        + f"{uuid.uuid4().hex}.{extension}"
    )


def _is_owned_storage_key(
    storage_key: str | None,
    *,
    tenant_id,
    company_id,
) -> bool:

    if not storage_key:
        return False

    normalized = str(
        PurePosixPath(
            storage_key
        )
    )

    return normalized.startswith(
        _storage_prefix(
            tenant_id=tenant_id,
            company_id=company_id,
        )
    )


def delete_owned_background_file(
    storage_key: str | None,
    *,
    tenant_id,
    company_id,
) -> None:

    if not _is_owned_storage_key(
        storage_key,
        tenant_id=tenant_id,
        company_id=company_id,
    ):
        return

    if default_storage.exists(
        storage_key
    ):
        default_storage.delete(
            storage_key
        )


def _audit(
    *,
    request,
    setting: Setting,
    action: str,
) -> None:

    AuditLog.objects.create(
        tenant_id=request.tenant_id,
        actor=request.user,
        action=action,
        object_type=(
            "governance.setting"
        ),
        object_id=setting.pk,
        metadata={
            "api":
                True,

            "company_id":
                str(
                    request.company_id
                ),

            "setting_key":
                BACKGROUND_SETTING_KEY,
        },
    )


def _write_setting(
    *,
    request,
    value: dict[str, Any],
    history_action: str,
) -> Setting:

    actor_id = _actor_id(
        request.user,
    )

    with transaction.atomic():

        queryset = (
            _setting_queryset(
                tenant_id=request.tenant_id,
                company_id=request.company_id,
            )
            .select_for_update()
        )

        setting = queryset.first()

        if setting is None:

            old_value = None

            setting = Setting.objects.create(
                tenant_id=request.tenant_id,
                company_id=request.company_id,
                branch_id=None,
                agency_id=None,
                scope_type="company",
                key=BACKGROUND_SETTING_KEY,
                value=value,
                value_type="json",
                is_secret=False,
                status="active",
                created_by_user_id=actor_id,
                updated_by_user_id=actor_id,
            )

        else:

            old_value = (
                setting.value
                if isinstance(
                    setting.value,
                    dict,
                )
                else None
            )

            setting.value = value
            setting.value_type = "json"
            setting.scope_type = "company"
            setting.branch_id = None
            setting.agency_id = None
            setting.status = "active"
            setting.updated_by_user_id = actor_id

            setting.save(
                update_fields=[
                    "value",
                    "value_type",
                    "scope_type",
                    "branch",
                    "agency",
                    "status",
                    "updated_by_user_id",
                    "updated_at",
                ]
            )

        SettingHistory.objects.create(
            tenant_id=request.tenant_id,
            company_id=request.company_id,
            setting=setting,
            action=history_action,
            old_value=old_value,
            new_value=value,
            changed_by_user_id=actor_id,
            change_reason=(
                "System background branding API"
            ),
        )

        _audit(
            request=request,
            setting=setting,
            action=history_action,
        )

    return setting


def upload_background(
    *,
    request,
    upload,
    options,
) -> Setting:

    validated = validate_background_image(
        upload,
    )

    existing = get_background_setting(
        tenant_id=request.tenant_id,
        company_id=request.company_id,
    )

    old_value = resolved_value(
        existing,
    )

    visual_options = normalize_visual_options(
        options,
        current=old_value,
    )

    storage_key = _new_storage_key(
        tenant_id=request.tenant_id,
        company_id=request.company_id,
        extension=validated[
            "extension"
        ],
    )

    actual_storage_key = (
        default_storage.save(
            storage_key,
            ContentFile(
                validated[
                    "raw"
                ]
            ),
        )
    )

    value = {
        **visual_options,

        "mode":
            MODE_CUSTOM,

        "storage_key":
            actual_storage_key,

        "content_type":
            validated[
                "content_type"
            ],

        "size_bytes":
            validated[
                "size_bytes"
            ],

        "width":
            validated[
                "width"
            ],

        "height":
            validated[
                "height"
            ],

        "sha256":
            validated[
                "sha256"
            ],

        "asset_updated_at":
            timezone.now().isoformat(),
    }

    old_storage_key = (
        old_value.get(
            "storage_key"
        )
        if isinstance(
            old_value,
            dict,
        )
        else None
    )

    try:

        setting = _write_setting(
            request=request,
            value=value,
            history_action=(
                "background.upload"
            ),
        )

    except Exception:

        delete_owned_background_file(
            actual_storage_key,
            tenant_id=request.tenant_id,
            company_id=request.company_id,
        )

        raise

    if (
        old_storage_key
        and old_storage_key
        != actual_storage_key
    ):

        transaction.on_commit(
            lambda:
                delete_owned_background_file(
                    old_storage_key,
                    tenant_id=(
                        request.tenant_id
                    ),
                    company_id=(
                        request.company_id
                    ),
                )
        )

    return setting


def patch_background_options(
    *,
    request,
    data,
) -> Setting:

    existing = get_background_setting(
        tenant_id=request.tenant_id,
        company_id=request.company_id,
    )

    current = resolved_value(
        existing,
    )

    mode = current.get(
        "mode",
        MODE_DEFAULT,
    )

    if "mode" in data:

        requested_mode = str(
            data.get(
                "mode"
            )
        ).strip()

        if requested_mode not in VALID_MODES:
            raise ValidationError(
                {
                    "mode":
                        "Unsupported background mode."
                }
            )

        if (
            requested_mode
            == MODE_CUSTOM
            and not current.get(
                "storage_key"
            )
        ):
            raise ValidationError(
                {
                    "mode":
                        "Custom mode requires an uploaded image."
                }
            )

        mode = requested_mode

    visual = normalize_visual_options(
        data,
        current=current,
    )

    value = {
        **current,
        **visual,
        "mode":
            mode,
    }

    return _write_setting(
        request=request,
        value=value,
        history_action=(
            "background.options.update"
        ),
    )


def remove_background(
    *,
    request,
) -> Setting:

    existing = get_background_setting(
        tenant_id=request.tenant_id,
        company_id=request.company_id,
    )

    current = resolved_value(
        existing,
    )

    old_storage_key = current.get(
        "storage_key"
    )

    value = {
        **default_visual_options(),
        "mode":
            MODE_NONE,
    }

    setting = _write_setting(
        request=request,
        value=value,
        history_action=(
            "background.remove"
        ),
    )

    if old_storage_key:

        transaction.on_commit(
            lambda:
                delete_owned_background_file(
                    old_storage_key,
                    tenant_id=(
                        request.tenant_id
                    ),
                    company_id=(
                        request.company_id
                    ),
                )
        )

    return setting


def reset_background(
    *,
    request,
) -> Setting:

    existing = get_background_setting(
        tenant_id=request.tenant_id,
        company_id=request.company_id,
    )

    current = resolved_value(
        existing,
    )

    old_storage_key = current.get(
        "storage_key"
    )

    value = default_background_value()

    setting = _write_setting(
        request=request,
        value=value,
        history_action=(
            "background.reset"
        ),
    )

    if old_storage_key:

        transaction.on_commit(
            lambda:
                delete_owned_background_file(
                    old_storage_key,
                    tenant_id=(
                        request.tenant_id
                    ),
                    company_id=(
                        request.company_id
                    ),
                )
        )

    return setting
