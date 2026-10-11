from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.schemas import WorkspaceCreateRequest, WorkspaceMemberCreateRequest
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import Notification, User, Workspace, WorkspaceMember
from app.services.permissions import has_workspace_role


router = APIRouter(tags=["workspaces-and-notifications"])


def _workspace_result(db: Session, workspace: Workspace, user_id: str) -> dict:
    membership = db.query(WorkspaceMember).filter_by(workspace_id=workspace.id, user_id=user_id).first()
    role = "owner" if workspace.owner_id == user_id else membership.role if membership else "viewer"
    rows = db.query(WorkspaceMember, User).join(User, User.id == WorkspaceMember.user_id).filter(WorkspaceMember.workspace_id == workspace.id).all()
    members = [{"user_id": member.user_id, "username": account.username, "email": account.email, "role": member.role} for member, account in rows]
    owner = db.get(User, workspace.owner_id)
    if owner and not any(item["user_id"] == owner.id for item in members):
        members.insert(0, {"user_id": owner.id, "username": owner.username, "email": owner.email, "role": "owner"})
    return {"id": workspace.id, "name": workspace.name, "role": role, "members": members}


@router.get("/workspaces")
def list_workspaces(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspaces = db.query(Workspace).outerjoin(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id).filter(
        or_(Workspace.owner_id == user.id, WorkspaceMember.user_id == user.id)
    ).order_by(Workspace.created_at.desc()).all()
    return [_workspace_result(db, workspace, user.id) for workspace in workspaces]


@router.post("/workspaces", status_code=201)
def create_workspace(payload: WorkspaceCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = Workspace(name=payload.name.strip(), owner_id=user.id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return _workspace_result(db, workspace, user.id)


@router.post("/workspaces/{workspace_id}/members")
def add_workspace_member(workspace_id: str, payload: WorkspaceMemberCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = db.get(Workspace, workspace_id)
    if not workspace or not has_workspace_role(db, user.id, workspace_id, "admin"):
        raise HTTPException(status_code=404, detail="Workspace not found")
    target = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="That person needs a CodeGuard account before you can add them")
    if target.id == workspace.owner_id:
        return _workspace_result(db, workspace, user.id)
    if payload.role == "admin" and workspace.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can grant the admin role")
    membership = db.query(WorkspaceMember).filter_by(workspace_id=workspace.id, user_id=target.id).first()
    if membership:
        membership.role = payload.role
    else:
        membership = WorkspaceMember(workspace_id=workspace.id, user_id=target.id, role=payload.role)
        db.add(membership)
        db.add(Notification(user_id=target.id, title=f"Added to {workspace.name}",
                            message=f"{user.username or user.email} added you as a {payload.role}.",
                            link="/dashboard/projects"))
    db.commit()
    return _workspace_result(db, workspace, user.id)


@router.delete("/workspaces/{workspace_id}/members/{member_id}", status_code=204)
def remove_workspace_member(workspace_id: str, member_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = db.get(Workspace, workspace_id)
    if not workspace or not has_workspace_role(db, user.id, workspace_id, "admin"):
        raise HTTPException(status_code=404, detail="Workspace not found")
    if member_id == workspace.owner_id:
        raise HTTPException(status_code=409, detail="The workspace owner cannot be removed")
    membership = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=member_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Workspace member not found")
    if membership.role == "admin" and workspace.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can remove another admin")
    db.delete(membership)
    db.commit()


@router.get("/notifications")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return [{"id": item.id, "title": item.title, "message": item.message, "link": item.link,
             "read": item.read, "created_at": item.created_at} for item in rows]


@router.post("/notifications/read-all", status_code=204)
def read_all_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.read.is_(False)).update({"read": True})
    db.commit()


@router.post("/notifications/{notification_id}/read", status_code=204)
def read_notification(notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Notification).filter_by(id=notification_id, user_id=user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    item.read = True
    db.commit()
