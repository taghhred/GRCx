import secrets

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import Permission, Role, User

ROLE_DEFS = [
    ("Admin", "Full platform administration"),
    ("GRC Specialist", "SOAR queue and GRC case handling"),
    ("Risk Owner", "Risk assessment ownership"),
    ("Auditor", "Read-heavy audit access"),
    ("Viewer", "Read-only access"),
    (
        "Demo GRC Specialist",
        "Hackathon demo identity — read-only platform access with AI advisor",
    ),
]

# Restricted demo identity (server-side only; no reusable password published).
DEMO_USER_EMAIL = "demo.mohammed@grcx.local"
DEMO_USER_USERNAME = "demo_mohammed"
DEMO_USER_FULL_NAME = "Mohammed"
DEMO_USER_DEPARTMENT = "GRC Specialist"
DEMO_ROLE_NAME = "Demo GRC Specialist"

DEMO_PERMISSION_CODES = (
    "cases:read",
    "risk:read",
    "compliance:read",
    "identity:read",
    "bcm:read",
    "dr:read",
    "reports:read",
    "ai:use",
    "governance:read",
)

PERMISSION_CODES = [
    "cases:read",
    "cases:write",
    "risk:read",
    "risk:write",
    "compliance:read",
    "compliance:write",
    "identity:read",
    "identity:write",
    "bcm:read",
    "dr:read",
    "reports:read",
    "reports:write",
    "users:admin",
    "audit:read",
    "ai:use",
    # Governance
    "governance:read",
    "governance:policies:create",
    "governance:policies:update",
    "governance:policies:submit",
    "governance:policies:approve",
    "governance:policies:publish",
    "governance:policies:archive",
    "governance:policies:upload",
    "governance:kpis:create",
    "governance:kpis:update",
    "governance:kpis:import",
    "governance:kpis:export",
    "governance:kpis:measure",
    "governance:kpis:upload",
]

GOVERNANCE_SPECIALIST = (
    "governance:read",
    "governance:policies:create",
    "governance:policies:update",
    "governance:policies:submit",
    "governance:policies:upload",
    "governance:kpis:create",
    "governance:kpis:update",
    "governance:kpis:import",
    "governance:kpis:export",
    "governance:kpis:measure",
    "governance:kpis:upload",
)

GOVERNANCE_READ = ("governance:read", "governance:kpis:export")

# Local prototype only — password is never sent to the frontend; stored as Argon2id.
DEV_SEED_EMAIL = "test@grcx.local"
DEV_SEED_USERNAME = "test"
DEV_SEED_PASSWORD = "123456"
DEV_SEED_ROLE = "GRC Specialist"


def seed_rbac_and_demo_user(db: Session) -> None:
    if db.query(Role).count() == 0:
        perms: dict[str, Permission] = {}
        for code in PERMISSION_CODES:
            p = Permission(code=code, description=code)
            db.add(p)
            perms[code] = p
        db.flush()

        roles: dict[str, Role] = {}
        for name, desc in ROLE_DEFS:
            role = Role(name=name, description=desc)
            if name == "Admin":
                role.permissions = list(perms.values())
            elif name == "GRC Specialist":
                role.permissions = [
                    perms[c]
                    for c in (
                        "cases:read",
                        "cases:write",
                        "identity:read",
                        "identity:write",
                        "compliance:read",
                        "compliance:write",
                        "risk:read",
                        "risk:write",
                        "bcm:read",
                        "dr:read",
                        "ai:use",
                        "reports:read",
                        "reports:write",
                        *GOVERNANCE_SPECIALIST,
                    )
                ]
            elif name == "Auditor":
                role.permissions = [
                    perms[c]
                    for c in (
                        "cases:read",
                        "risk:read",
                        "compliance:read",
                        "identity:read",
                        "audit:read",
                        "reports:read",
                        *GOVERNANCE_READ,
                    )
                ]
            elif name == "Viewer":
                role.permissions = [
                    perms[c]
                    for c in (
                        "cases:read",
                        "risk:read",
                        "compliance:read",
                        "identity:read",
                        "bcm:read",
                        "dr:read",
                        "reports:read",
                        "ai:use",
                        "governance:read",
                    )
                ]
            elif name == DEMO_ROLE_NAME:
                role.permissions = [
                    perms[c] for c in DEMO_PERMISSION_CODES if c in perms
                ]
            db.add(role)
            roles[name] = role
        db.flush()
    else:
        roles = {r.name: r for r in db.query(Role).all()}
        _ensure_governance_permissions(db, roles)

    _ensure_dev_seed_user(db, roles)
    _ensure_demo_mode_user(db, roles)
    db.commit()


def _ensure_governance_permissions(db: Session, roles: dict[str, Role]) -> None:
    """Idempotent: add new governance permission codes to existing DBs."""
    existing = {p.code: p for p in db.query(Permission).all()}
    created = False
    for code in PERMISSION_CODES:
        if code not in existing:
            p = Permission(code=code, description=code)
            db.add(p)
            existing[code] = p
            created = True
    if created:
        db.flush()

    admin = roles.get("Admin")
    if admin is not None:
        held = {p.code for p in admin.permissions}
        for code, perm in existing.items():
            if code not in held:
                admin.permissions.append(perm)

    specialist = roles.get("GRC Specialist")
    if specialist is not None:
        held = {p.code for p in specialist.permissions}
        for code in (
            *GOVERNANCE_SPECIALIST,
            "risk:write",
            "risk:read",
            "cases:read",
            "cases:write",
            "identity:read",
            "identity:write",
            "compliance:read",
            "compliance:write",
            "bcm:read",
            "dr:read",
            "reports:read",
            "reports:write",
            "ai:use",
        ):
            if code not in held and code in existing:
                specialist.permissions.append(existing[code])

    # Also expand initial create list when roles are first seeded
    # (handled above for existing DBs)
    auditor = roles.get("Auditor")
    if auditor is not None:
        held = {p.code for p in auditor.permissions}
        for code in GOVERNANCE_READ:
            if code not in held and code in existing:
                auditor.permissions.append(existing[code])

    viewer = roles.get("Viewer")
    if viewer is not None:
        held = {p.code for p in viewer.permissions}
        if "governance:read" not in held and "governance:read" in existing:
            viewer.permissions.append(existing["governance:read"])

    demo_role = roles.get(DEMO_ROLE_NAME)
    if demo_role is None:
        demo_role = Role(
            name=DEMO_ROLE_NAME,
            description="Hackathon demo identity — read-only platform access with AI advisor",
        )
        db.add(demo_role)
        db.flush()
        roles[DEMO_ROLE_NAME] = demo_role
    held = {p.code for p in demo_role.permissions}
    for code in DEMO_PERMISSION_CODES:
        if code not in held and code in existing:
            demo_role.permissions.append(existing[code])
    # Never inherit Admin / write permissions onto the demo role.
    demo_role.permissions = [
        p for p in demo_role.permissions if p.code in DEMO_PERMISSION_CODES
    ]


def _ensure_demo_mode_user(db: Session, roles: dict[str, Role]) -> None:
    """Create/repair the restricted hackathon demo user when DEMO_MODE is on."""
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.demo_mode:
        return

    demo_role = roles.get(DEMO_ROLE_NAME)
    if demo_role is None:
        return

    user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    if user is None:
        # Unusable random secret — demo entry is only via POST /auth/demo.
        user = User(
            email=DEMO_USER_EMAIL,
            username=DEMO_USER_USERNAME,
            full_name=DEMO_USER_FULL_NAME,
            department=DEMO_USER_DEPARTMENT,
            hashed_password=hash_password(secrets.token_urlsafe(48)),
            is_active=True,
            is_manager=False,
            roles=[demo_role],
        )
        db.add(user)
        return

    # Hard-lock: never Admin, never write-capable specialist roles.
    user.full_name = DEMO_USER_FULL_NAME
    user.department = DEMO_USER_DEPARTMENT
    user.username = DEMO_USER_USERNAME
    user.is_active = True
    user.is_manager = False
    user.roles = [demo_role]


def _ensure_dev_seed_user(db: Session, roles: dict[str, Role]) -> None:
    """Create the local prototype account if missing — development/test only."""
    from app.core.config import get_settings

    settings = get_settings()
    if settings.grcx_env == "production":
        return

    specialist = roles.get(DEV_SEED_ROLE)
    if specialist is None:
        return

    # Remove legacy prototype account if present
    legacy = (
        db.query(User)
        .filter(
            (User.email == "mohammed@grcx.local") | (User.username == "mohammed")
        )
        .all()
    )
    for row in legacy:
        db.delete(row)
    db.flush()

    user = db.query(User).filter(User.email == DEV_SEED_EMAIL).first()
    if user is not None:
        # Existing seed user — do not reset password on every boot,
        # except in explicit test env.
        if settings.grcx_env == "test":
            user.hashed_password = hash_password(DEV_SEED_PASSWORD)
            user.roles = [specialist]
            user.is_active = True
        return

    user = User(
        email=DEV_SEED_EMAIL,
        username=DEV_SEED_USERNAME,
        full_name="Mohammed",
        department="GRC",
        hashed_password=hash_password(DEV_SEED_PASSWORD),
        is_active=True,
        is_manager=False,
        roles=[specialist],
    )
    db.add(user)
