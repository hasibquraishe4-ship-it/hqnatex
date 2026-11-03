from rest_framework import serializers

from apps.accounting.models import JournalEntry, JournalEntryLine


# HQNATEX_ACCOUNTING_GENERAL_LEDGER_SERIALIZER_V1
def _resolve_journal_relation_name():
    matches = [
        field.name
        for field in JournalEntryLine._meta.fields
        if getattr(field, "related_model", None) is JournalEntry
    ]

    if len(matches) != 1:
        raise RuntimeError(
            "JournalEntryLine must have exactly one relation to JournalEntry."
        )

    return matches[0]


JOURNAL_RELATION_NAME = _resolve_journal_relation_name()


class GeneralLedgerLineSerializer(serializers.ModelSerializer):
    journal_number = serializers.SerializerMethodField()
    journal_date = serializers.SerializerMethodField()
    journal_status = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntryLine
        fields = [
            field.name
            for field in JournalEntryLine._meta.fields
        ] + [
            "journal_number",
            "journal_date",
            "journal_status",
        ]
        read_only_fields = fields

    def _journal(self, obj):
        return getattr(obj, JOURNAL_RELATION_NAME)

    def get_journal_number(self, obj):
        journal = self._journal(obj)
        return getattr(journal, "entry_number", None)

    def get_journal_date(self, obj):
        journal = self._journal(obj)
        for field_name in (
            "entry_date",
            "journal_date",
            "posting_date",
            "date",
        ):
            if hasattr(journal, field_name):
                return getattr(journal, field_name)
        return None

    def get_journal_status(self, obj):
        journal = self._journal(obj)
        return getattr(journal, "status", None)

