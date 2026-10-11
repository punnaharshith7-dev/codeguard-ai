from sqlalchemy.orm import Session

from app.models.entities import Scan, Workspace, WorkspaceMember


ROLE_RANK = {"viewer": 0, "member": 1, "admin": 2, "owner": 3}


def workspace_role(db: Session, user_id: str, workspace_id: str | None) -> str | None:
    if not workspace_id:
        return None
    workspace = db.get(Workspace, workspace_id)
    if workspace and workspace.owner_id == user_id:
        return "owner"
    membership = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=user_id).first()
    return membership.role if membership else None


def has_workspace_role(db: Session, user_id: str, workspace_id: str | None, minimum: str = "viewer") -> bool:
    role = workspace_role(db, user_id, workspace_id)
    return role is not None and ROLE_RANK.get(role, -1) >= ROLE_RANK[minimum]


def visible_workspace_ids(db: Session, user_id: str) -> list[str]:
    owned = [row.id for row in db.query(Workspace.id).filter(Workspace.owner_id == user_id).all()]
    member = [row.workspace_id for row in db.query(WorkspaceMember.workspace_id).filter(WorkspaceMember.user_id == user_id).all()]
    return list(dict.fromkeys([*owned, *member]))


def can_access_scan(db: Session, user_id: str, scan: Scan) -> bool:
    if scan.workspace_id:
        return has_workspace_role(db, user_id, scan.workspace_id)
    return scan.user_id == user_id
