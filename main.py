from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from models import Product, ProductCreate, ProductRead, engine

app = FastAPI()

@app.get("/inventory", response_model=list[ProductRead])
def get_inventory():
    with Session(engine) as session:
        return session.exec(select(Product)).all()

@app.delete("/inventory/{id}")
def delete_item(id: int):
    with Session(engine) as session:
        product = session.get(Product, id)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
        session.delete(product)
        session.commit()
    return {"message": "Product deleted", "id": id}

@app.post("/inventory", response_model=ProductRead, status_code=201)
def create_item(item: ProductCreate):
    product = Product.model_validate(item)

    with Session(engine) as session:
        session.add(product)

        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            raise HTTPException(status_code=400, detail="A product with that SKU already exists")

        session.refresh(product)

    return product

@app.put("/inventory/{id}", response_model=ProductRead)
def modify_item(id: int, item: ProductCreate):
    with Session(engine) as session:
        product = session.get(Product, id)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")

        product.sports = item.sports
        product.category = item.category
        product.quantity = item.quantity
        product.unit_price = item.unit_price
        product.sku = item.sku
        product.storage_location = item.storage_location

        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            raise HTTPException(status_code=400, detail="A product with that SKU already exists")

        session.refresh(product)

    return product


app.mount("/", StaticFiles(directory="static", html=True), name="static")