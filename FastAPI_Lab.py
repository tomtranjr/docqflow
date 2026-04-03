from fastapi import HTTPException
from fastapi import FastAPI
from pydantic import BaseModel

# 1. Create a FastAPI App Instance
app = FastAPI()
items = {}  # In-memory database


class Item(BaseModel):
    # 3. Define Pydantic Model
    name: str
    price: float
    instock_qt: int


class ItemResponse(BaseModel):
    total_worth: float


# 2. Define a function and associate with a route.

@app.get("/")
def read_root():
    return {"Message": "Welcome to our FastAPI App!"}


@app.get("/health/")
def read_item_w_path_param():
    return {"Status": "OK"}


@app.get("/predict/")
def read_item_w_query_param(item_id: int | None = None, ct: int = 0):
    return {"item_id": item_id, "count": ct}


@app.get("/name")
def return_name(name: str):
    return {"name": name}


@app.post("/add_items/")
def create_item(item: Item):
    # 2. Define a function and associate with a route.
    items[item.name] = item
    return {"message": "Item added successfully", "items": items}


@app.post("/add_items/", response_model=ItemResponse)
def create_item(item: Item):
    # 2. Define a function and associate with a route.
    items[item.name] = item
    return {"message": "Item added successfully",
            "total_worth": item.price * item.instock_qt,
            "items": items}


class ItemDetaliResponse(BaseModel):
    name: str
    price: float


@app.get("/item_details/{item_name}", response_model=ItemDetaliResponse)
def return_item_details(item_name: str):
    if (item_name not in items.keys()):
        raise HTTPException(
            status_code=404,
            detail=f"Item, {item_name} not found")

    return {"name": items[item_name].name,
            "price": items[item_name].price}


import asyncio
import time
import httpx
from fastapi import FastAPI

app = FastAPI()

url = "https://httpbin.org/delay/1.2"  # send a response after 1.2 sec


@app.get("/sync")
def sync_call():
    response1 = httpx.get(url)
    response2 = httpx.get(url)
    return {"first": response1.json(),
            "second": response2.json()}


@app.get("/async")
async def async_call():
    # TODO: COMPLETE THIS TO BE AN ASYNC VERSION OF sync_call()
    async with httpx.AsyncClient() as client:
        response1 = await client.get(url)
        response2 = await client.get(url)
    return {"first": response1.json(),
            "second": response2.json()}
