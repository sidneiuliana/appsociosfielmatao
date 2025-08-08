from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import qrcode
from io import BytesIO
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Utility function to generate QR code
def generate_qr_code(product_data: dict) -> str:
    """Generate QR code for product and return base64 encoded image"""
    qr_data = f"Product: {product_data['name']}\nID: {product_data['product_id']}\nValue: ${product_data['value']}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Product Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str  # Campo específico ID conforme solicitado
    name: str
    value: float
    stock: int = 0
    qr_code_data: Optional[str] = None
    qr_code_image: Optional[str] = None  # Base64 encoded QR code image
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProductCreate(BaseModel):
    product_id: str
    name: str
    value: float
    stock: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[float] = None
    stock: Optional[int] = None

# Ticket Models
class Ticket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    product_value: float
    ticket_number: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    quantity: int = 1
    is_redeemed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    redeemed_at: Optional[datetime] = None

class TicketCreate(BaseModel):
    product_id: str
    quantity: int = 1

class TicketRedeem(BaseModel):
    ticket_id: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Product Endpoints
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate):
    """Create a new product with QR code"""
    
    # Check if product_id already exists
    existing_product = await db.products.find_one({"product_id": product_data.product_id})
    if existing_product:
        raise HTTPException(status_code=400, detail="Product ID already exists")
    
    # Create product dict
    product_dict = product_data.dict()
    product_obj = Product(**product_dict)
    
    # Generate QR code
    qr_data = f"Product: {product_obj.name}\nID: {product_obj.product_id}\nValue: ${product_obj.value}"
    qr_image = generate_qr_code(product_dict)
    
    # Update product with QR code data
    product_obj.qr_code_data = qr_data
    product_obj.qr_code_image = qr_image
    
    # Insert into database
    await db.products.insert_one(product_obj.dict())
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_products():
    """Get all products"""
    products = await db.products.find().to_list(1000)
    return [Product(**product) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get a specific product by product_id"""
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, update_data: ProductUpdate):
    """Update a product"""
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Prepare update data
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    # If name or value changed, regenerate QR code
    if "name" in update_dict or "value" in update_dict:
        updated_product_data = {**product, **update_dict}
        qr_data = f"Product: {updated_product_data['name']}\nID: {updated_product_data['product_id']}\nValue: ${updated_product_data['value']}"
        qr_image = generate_qr_code(updated_product_data)
        update_dict["qr_code_data"] = qr_data
        update_dict["qr_code_image"] = qr_image
    
    # Update product
    await db.products.update_one({"product_id": product_id}, {"$set": update_dict})
    
    # Return updated product
    updated_product = await db.products.find_one({"product_id": product_id})
    return Product(**updated_product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product"""
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
