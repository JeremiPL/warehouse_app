from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlmodel import Field, SQLModel, create_engine


BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'db' / 'warehouse.db'}"


class ProductBase(SQLModel):
	sports: str
	category: str
	quantity: int = Field(default=0, ge=0)
	unit_price: float = Field(ge=0)
	sku: str
	storage_location: Optional[str] = None


class Product(ProductBase, table=True):
	__tablename__ = "products"

	id: Optional[int] = Field(default=None, primary_key=True)
	sku: str = Field(index=True, unique=True)
	created_at: datetime = Field(default_factory=datetime.utcnow)


class ProductCreate(ProductBase):
	pass


class ProductRead(ProductBase):
	id: int
	created_at: datetime


engine = create_engine(
	DATABASE_URL,
	echo=False,
	connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
	SQLModel.metadata.create_all(engine)
