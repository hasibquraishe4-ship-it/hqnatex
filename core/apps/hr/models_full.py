import uuid

from django.conf import settings
from django.db import models


class HRScopedModel(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        db_column="tenant_id",
    )

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        db_column="company_id",
    )

    branch_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
    )

    notes = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        abstract = True


class Employee(HRScopedModel):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_employee_profiles",
    )

    employee_number = models.CharField(
        max_length=64,
    )

    first_name = models.CharField(
        max_length=120,
    )

    last_name = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    father_name = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    gender = models.CharField(
        max_length=32,
        blank=True,
        default="",
        choices=[("مرد", "Male"), ("زن", "Female")],
    )

    # HQNATEX_HR_EMPLOYEE_CHOICES_V1
    marital_status = models.CharField(
        max_length=32,
        blank=True,
        default="",
        choices=[("single", "Single"), ("married", "Married")],
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    national_id = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    passport_number = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    phone = models.CharField(
        max_length=64,
        blank=True,
        default="",
    )

    alternate_phone = models.CharField(
        max_length=64,
        blank=True,
        default="",
    )

    email = models.EmailField(
        blank=True,
        default="",
    )

    address = models.TextField(
        blank=True,
        default="",
    )

    department = models.ForeignKey(
        "hr.Department",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="employees",
    )

    position = models.ForeignKey(
        "hr.Position",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="employees",
    )

    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="direct_reports",
    )

    hire_date = models.DateField(
        null=True,
        blank=True,
    )

    employment_status = models.CharField(
        max_length=32,
        default="active",
        db_index=True,
        choices=[("active", "Active"), ("inactive", "Inactive")],
    )

    photo_url = models.URLField(
        blank=True,
        default="",
    )

    class Meta:
        db_table = "hr_employees"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "employee_number",
                ],
                name="uq_hr_emp_number",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "employment_status",
                ],
                name="ix_hr_emp_status",
            ),
        ]


class EmploymentContract(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="contracts",
    )

    contract_type = models.CharField(
        max_length=32,
        default="permanent",
    )

    start_date = models.DateField()

    end_date = models.DateField(
        null=True,
        blank=True,
    )

    probation_end_date = models.DateField(
        null=True,
        blank=True,
    )

    base_salary = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    currency = models.CharField(
        max_length=8,
        default="AFN",
    )

    weekly_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=40,
    )

    status = models.CharField(
        max_length=32,
        default="active",
        db_index=True,
    )

    class Meta:
        db_table = "hr_employment_contracts"


class WorkShift(HRScopedModel):

    code = models.CharField(
        max_length=64,
    )

    name = models.CharField(
        max_length=120,
    )

    start_time = models.TimeField()
    end_time = models.TimeField()

    break_minutes = models.PositiveIntegerField(
        default=0,
    )

    working_days = models.JSONField(
        default=list,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_work_shifts"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "code",
                ],
                name="uq_hr_shift_code",
            ),
        ]


class EmployeeShift(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="shift_assignments",
    )

    shift = models.ForeignKey(
        WorkShift,
        on_delete=models.PROTECT,
        related_name="employee_assignments",
    )

    start_date = models.DateField()

    end_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_employee_shifts"


class Attendance(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="attendance_records",
    )

    date = models.DateField(
        db_index=True,
    )

    check_in = models.DateTimeField(
        null=True,
        blank=True,
    )

    check_out = models.DateTimeField(
        null=True,
        blank=True,
    )

    attendance_status = models.CharField(
        max_length=32,
        default="present",
    )

    late_minutes = models.PositiveIntegerField(
        default=0,
    )

    overtime_minutes = models.PositiveIntegerField(
        default=0,
    )

    class Meta:
        db_table = "hr_attendance"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "employee",
                    "date",
                ],
                name="uq_hr_att_day",
            ),
        ]


class LeaveType(HRScopedModel):

    code = models.CharField(
        max_length=64,
    )

    name = models.CharField(
        max_length=120,
    )

    annual_quota_days = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )

    is_paid = models.BooleanField(
        default=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_leave_types"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "code",
                ],
                name="uq_hr_leave_type",
            ),
        ]


class LeaveBalance(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="leave_balances",
    )

    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="balances",
    )

    year = models.PositiveIntegerField()

    allocated_days = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )

    used_days = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )

    class Meta:
        db_table = "hr_leave_balances"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "employee",
                    "leave_type",
                    "year",
                ],
                name="uq_hr_leave_balance",
            ),
        ]


class LeaveRequest(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="leave_requests",
    )

    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="requests",
    )

    start_date = models.DateField()
    end_date = models.DateField()

    days = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )

    reason = models.TextField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="pending",
        db_index=True,
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_hr_leave_requests",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "hr_leave_requests"


class PublicHoliday(HRScopedModel):

    date = models.DateField()

    name = models.CharField(
        max_length=160,
    )

    is_paid = models.BooleanField(
        default=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_public_holidays"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "date",
                ],
                name="uq_hr_holiday_day",
            ),
        ]


class Overtime(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="overtime_records",
    )

    date = models.DateField()

    hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )

    hourly_rate = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    status = models.CharField(
        max_length=32,
        default="pending",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_hr_overtime",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "hr_overtime"


class SalaryProfile(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="salary_profiles",
    )

    effective_from = models.DateField()

    base_salary = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    currency = models.CharField(
        max_length=8,
        default="AFN",
    )

    pay_frequency = models.CharField(
        max_length=32,
        default="monthly",
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_salary_profiles"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "employee",
                    "effective_from",
                ],
                name="uq_hr_salary_eff",
            ),
        ]


class PayrollTaxBracket(HRScopedModel):

    name = models.CharField(
        max_length=160,
    )

    currency = models.CharField(
        max_length=8,
        default="AFN",
    )

    minimum_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    maximum_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )

    rate_percent = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=0,
    )

    fixed_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    effective_from = models.DateField()

    effective_to = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_payroll_tax_brackets"


class Allowance(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="allowances",
    )

    name = models.CharField(
        max_length=160,
    )

    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    recurring = models.BooleanField(
        default=True,
    )

    effective_from = models.DateField(
        null=True,
        blank=True,
    )

    effective_to = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_allowances"


class Deduction(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="deductions",
    )

    name = models.CharField(
        max_length=160,
    )

    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    recurring = models.BooleanField(
        default=True,
    )

    effective_from = models.DateField(
        null=True,
        blank=True,
    )

    effective_to = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_deductions"


class PayrollPeriod(HRScopedModel):

    code = models.CharField(
        max_length=64,
    )

    start_date = models.DateField()
    end_date = models.DateField()

    status = models.CharField(
        max_length=32,
        default="open",
    )

    class Meta:
        db_table = "hr_payroll_periods"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "code",
                ],
                name="uq_hr_period_code",
            ),
        ]


class PayrollRun(HRScopedModel):

    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.PROTECT,
        related_name="runs",
    )

    run_number = models.CharField(
        max_length=64,
    )

    status = models.CharField(
        max_length=32,
        default="draft",
    )

    processed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_payroll_runs",
    )

    class Meta:
        db_table = "hr_payroll_runs"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "run_number",
                ],
                name="uq_hr_run_number",
            ),
        ]


class PayrollEntry(HRScopedModel):

    run = models.ForeignKey(
        PayrollRun,
        on_delete=models.PROTECT,
        related_name="entries",
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="payroll_entries",
    )

    salary_profile = models.ForeignKey(
        SalaryProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_entries",
    )

    base_salary = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    allowance_total = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    overtime_total = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    gross_pay = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    deduction_total = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    tax_total = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    net_pay = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    currency = models.CharField(
        max_length=8,
        default="AFN",
    )

    status = models.CharField(
        max_length=32,
        default="draft",
    )

    class Meta:
        db_table = "hr_payroll_entries"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "run",
                    "employee",
                ],
                name="uq_hr_entry_run_emp",
            ),
        ]


class PayrollPayment(HRScopedModel):

    payroll_entry = models.ForeignKey(
        PayrollEntry,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    payment_method = models.CharField(
        max_length=32,
        default="bank",
    )

    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reference = models.CharField(
        max_length=160,
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="pending",
    )

    class Meta:
        db_table = "hr_payroll_payments"


class Payslip(HRScopedModel):

    payroll_entry = models.OneToOneField(
        PayrollEntry,
        on_delete=models.PROTECT,
        related_name="payslip",
    )

    slip_number = models.CharField(
        max_length=96,
    )

    issued_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="draft",
    )

    class Meta:
        db_table = "hr_payslips"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "slip_number",
                ],
                name="uq_hr_slip_number",
            ),
        ]


class EmployeeLoan(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="loans",
    )

    loan_number = models.CharField(
        max_length=64,
    )

    principal_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    installment_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    outstanding_balance = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    start_date = models.DateField()

    end_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_employee_loans"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "loan_number",
                ],
                name="uq_hr_loan_number",
            ),
        ]


class SalaryAdvance(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="salary_advances",
    )

    request_date = models.DateField()

    requested_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    approved_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    recovery_periods = models.PositiveIntegerField(
        default=1,
    )

    status = models.CharField(
        max_length=32,
        default="pending",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_salary_advances",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "hr_salary_advances"


class Vacancy(HRScopedModel):

    title = models.CharField(
        max_length=180,
    )

    department = models.ForeignKey(
        "hr.Department",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="vacancies",
    )

    position = models.ForeignKey(
        "hr.Position",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="vacancies",
    )

    openings = models.PositiveIntegerField(
        default=1,
    )

    opened_at = models.DateField(
        null=True,
        blank=True,
    )

    closing_at = models.DateField(
        null=True,
        blank=True,
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="open",
    )

    class Meta:
        db_table = "hr_vacancies"


class Candidate(HRScopedModel):

    vacancy = models.ForeignKey(
        Vacancy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="candidates",
    )

    full_name = models.CharField(
        max_length=180,
    )

    email = models.EmailField(
        blank=True,
        default="",
    )

    phone = models.CharField(
        max_length=64,
        blank=True,
        default="",
    )

    cv_url = models.URLField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="new",
    )

    class Meta:
        db_table = "hr_candidates"


class Interview(HRScopedModel):

    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.PROTECT,
        related_name="interviews",
    )

    scheduled_at = models.DateTimeField()

    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_interviews",
    )

    score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="scheduled",
    )

    class Meta:
        db_table = "hr_interviews"


class OnboardingTask(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="onboarding_tasks",
    )

    title = models.CharField(
        max_length=180,
    )

    due_date = models.DateField(
        null=True,
        blank=True,
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_onboarding_tasks",
    )

    status = models.CharField(
        max_length=32,
        default="pending",
    )

    class Meta:
        db_table = "hr_onboarding_tasks"


class PerformanceReview(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="performance_reviews",
    )

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_reviews_given",
    )

    period_start = models.DateField()
    period_end = models.DateField()

    score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
    )

    goals = models.TextField(
        blank=True,
        default="",
    )

    comments = models.TextField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="draft",
    )

    class Meta:
        db_table = "hr_performance_reviews"


class Training(HRScopedModel):

    title = models.CharField(
        max_length=180,
    )

    provider = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )

    start_date = models.DateField(
        null=True,
        blank=True,
    )

    end_date = models.DateField(
        null=True,
        blank=True,
    )

    cost = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    status = models.CharField(
        max_length=32,
        default="planned",
    )

    class Meta:
        db_table = "hr_trainings"


class TrainingParticipant(HRScopedModel):

    training = models.ForeignKey(
        Training,
        on_delete=models.PROTECT,
        related_name="participants",
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="training_participations",
    )

    participant_status = models.CharField(
        max_length=32,
        default="registered",
    )

    certificate_reference = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )

    class Meta:
        db_table = "hr_training_participants"

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "training",
                    "employee",
                ],
                name="uq_hr_training_emp",
            ),
        ]


class DisciplinaryAction(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="disciplinary_actions",
    )

    action_type = models.CharField(
        max_length=64,
    )

    incident_date = models.DateField()

    details = models.TextField()

    effective_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_disciplinary_actions"


class PromotionTransfer(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="promotion_transfers",
    )

    change_type = models.CharField(
        max_length=64,
    )

    effective_date = models.DateField()

    from_department = models.ForeignKey(
        "hr.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    to_department = models.ForeignKey(
        "hr.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    from_position = models.ForeignKey(
        "hr.Position",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    to_position = models.ForeignKey(
        "hr.Position",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    from_branch_id = models.UUIDField(
        null=True,
        blank=True,
    )

    to_branch_id = models.UUIDField(
        null=True,
        blank=True,
    )

    old_salary = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )

    new_salary = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=32,
        default="pending",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_hr_changes",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "hr_promotion_transfers"


class EmployeeAsset(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="assigned_assets",
    )

    inventory_serial = models.ForeignKey(
        "warehouse.InventorySerial",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="hr_assignments",
    )

    asset_tag = models.CharField(
        max_length=160,
        blank=True,
        default="",
    )

    assigned_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    returned_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    condition_out = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    condition_in = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="assigned",
    )

    class Meta:
        db_table = "hr_employee_assets"


class EmergencyContact(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="emergency_contacts",
    )

    name = models.CharField(
        max_length=180,
    )

    relationship = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    phone = models.CharField(
        max_length=64,
    )

    address = models.TextField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_emergency_contacts"


class EmployeeBankAccount(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="bank_accounts",
    )

    bank_name = models.CharField(
        max_length=180,
    )

    account_name = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )

    account_number = models.CharField(
        max_length=180,
    )

    iban = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )

    is_primary = models.BooleanField(
        default=False,
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_bank_accounts"


class EmployeeDocument(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="documents",
    )

    document_type = models.CharField(
        max_length=120,
    )

    title = models.CharField(
        max_length=180,
    )

    reference_number = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )

    issued_at = models.DateField(
        null=True,
        blank=True,
    )

    expires_at = models.DateField(
        null=True,
        blank=True,
    )

    file_url = models.URLField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="active",
    )

    class Meta:
        db_table = "hr_employee_documents"


class Termination(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="terminations",
    )

    termination_type = models.CharField(
        max_length=64,
    )

    notice_date = models.DateField(
        null=True,
        blank=True,
    )

    last_working_date = models.DateField()

    reason = models.TextField(
        blank=True,
        default="",
    )

    status = models.CharField(
        max_length=32,
        default="pending",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_hr_terminations",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "hr_terminations"


class Clearance(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="clearance_items",
    )

    department_name = models.CharField(
        max_length=180,
    )

    item = models.CharField(
        max_length=180,
    )

    clearance_status = models.CharField(
        max_length=32,
        default="pending",
    )

    cleared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_clearances",
    )

    cleared_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "hr_clearances"


class ApprovalRequest(HRScopedModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approval_requests",
    )

    request_type = models.CharField(
        max_length=120,
    )

    object_type = models.CharField(
        max_length=120,
    )

    object_id = models.UUIDField(
        null=True,
        blank=True,
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_requests_created",
    )

    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_requests_to_approve",
    )

    status = models.CharField(
        max_length=32,
        default="pending",
    )

    requested_at = models.DateTimeField(
        auto_now_add=True,
    )

    decided_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    comments = models.TextField(
        blank=True,
        default="",
    )

    class Meta:
        db_table = "hr_approval_requests"


class HRAuditEvent(HRScopedModel):

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_audit_events",
    )

    action = models.CharField(
        max_length=64,
    )

    object_type = models.CharField(
        max_length=120,
    )

    object_id = models.UUIDField(
        null=True,
        blank=True,
    )

    payload = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "hr_audit_events"


ALL_HR_TABLES = (
    "hr_employees",
    "hr_employment_contracts",
    "hr_work_shifts",
    "hr_employee_shifts",
    "hr_attendance",
    "hr_leave_types",
    "hr_leave_balances",
    "hr_leave_requests",
    "hr_public_holidays",
    "hr_overtime",
    "hr_salary_profiles",
    "hr_payroll_tax_brackets",
    "hr_allowances",
    "hr_deductions",
    "hr_payroll_periods",
    "hr_payroll_runs",
    "hr_payroll_entries",
    "hr_payroll_payments",
    "hr_payslips",
    "hr_employee_loans",
    "hr_salary_advances",
    "hr_vacancies",
    "hr_candidates",
    "hr_interviews",
    "hr_onboarding_tasks",
    "hr_performance_reviews",
    "hr_trainings",
    "hr_training_participants",
    "hr_disciplinary_actions",
    "hr_promotion_transfers",
    "hr_employee_assets",
    "hr_emergency_contacts",
    "hr_bank_accounts",
    "hr_employee_documents",
    "hr_terminations",
    "hr_clearances",
    "hr_approval_requests",
    "hr_audit_events",
)


__all__ = [
    "Employee",
    "EmploymentContract",
    "WorkShift",
    "EmployeeShift",
    "Attendance",
    "LeaveType",
    "LeaveBalance",
    "LeaveRequest",
    "PublicHoliday",
    "Overtime",
    "SalaryProfile",
    "PayrollTaxBracket",
    "Allowance",
    "Deduction",
    "PayrollPeriod",
    "PayrollRun",
    "PayrollEntry",
    "PayrollPayment",
    "Payslip",
    "EmployeeLoan",
    "SalaryAdvance",
    "Vacancy",
    "Candidate",
    "Interview",
    "OnboardingTask",
    "PerformanceReview",
    "Training",
    "TrainingParticipant",
    "DisciplinaryAction",
    "PromotionTransfer",
    "EmployeeAsset",
    "EmergencyContact",
    "EmployeeBankAccount",
    "EmployeeDocument",
    "Termination",
    "Clearance",
    "ApprovalRequest",
    "HRAuditEvent",
]
