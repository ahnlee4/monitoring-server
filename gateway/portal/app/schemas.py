from typing import Literal

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class EmailVerificationRequestIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class EmailVerificationConfirmIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    code: str = Field(min_length=6, max_length=6)


class SignupIn(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=12, max_length=128)
    display_name: str = Field(min_length=1, max_length=128)
    contact_type: Literal["email", "phone"]
    contact_value: str = Field(min_length=3, max_length=254)
    email_verification_token: str | None = Field(default=None, max_length=256)
    privacy_agreed: bool


class UserCreateIn(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=12, max_length=128)
    display_name: str = Field(min_length=1, max_length=128)
    is_admin: bool = False
    server_ids: list[int] = Field(default_factory=list)


class UserUpdateIn(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=64)
    password: str | None = Field(default=None, min_length=12, max_length=128)
    display_name: str | None = Field(default=None, min_length=1, max_length=128)
    is_admin: bool | None = None
    is_active: bool | None = None


class UserAccessIn(BaseModel):
    server_ids: list[int] = Field(default_factory=list)


class ServerCreateIn(BaseModel):
    slug: str = Field(min_length=1, max_length=63)
    name: str = Field(min_length=1, max_length=128)
    target_host: str = Field(min_length=7, max_length=64)
    target_port: int = Field(default=80, ge=1, le=65535)


class ServerUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    target_host: str | None = Field(default=None, min_length=7, max_length=64)
    target_port: int | None = Field(default=None, ge=1, le=65535)
    is_active: bool | None = None
