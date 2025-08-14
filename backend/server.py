from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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

from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.mysql import DATETIME

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MySQL connection
DATABASE_URL = "mysql+pymysql://root:Sepultura%40123@localhost/product_management"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get the DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
# Define SQLAlchemy Models
class DBStatusCheck(Base):
    __tablename__ = "status_checks"
    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_name = Column(String(255), index=True)
    timestamp = Column(DATETIME(fsp=6), default=datetime.utcnow)

class DBProduct(Base):
    __tablename__ = "products"
    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(255), unique=True, index=True)
    name = Column(String(255))
    value = Column(Float)
    stock = Column(Integer, default=0)
    printed_quantity = Column(Integer, default=0)
    qr_code_data = Column(String(255), nullable=True)
    qr_code_image = Column(String(2000), nullable=True)  # Increased length for base64 image
    status = Column(String, default="active") # 'active' or 'inactive'
    created_at = Column(DATETIME(fsp=6), default=datetime.utcnow)
    updated_at = Column(DATETIME(fsp=6), default=datetime.utcnow, onupdate=datetime.utcnow)

class DBTicket(Base):
    __tablename__ = "tickets"
    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(255), index=True)
    product_name = Column(String(255))
    product_value = Column(Float)
    ticket_number = Column(String(255), default=lambda: str(uuid.uuid4())[:8], unique=True)
    quantity = Column(Integer, default=1)
    is_redeemed = Column(Boolean, default=False)
    created_at = Column(DATETIME(fsp=6), default=datetime.utcnow)
    redeemed_at = Column(DATETIME(fsp=6), nullable=True)

# Create tables
Base.metadata.create_all(bind=engine)

# Utility function to generate QR code
def generate_qr_code(product: DBProduct) -> str:
    """Generate QR code for product and return base64 encoded image"""
    qr_data = f"Product: {product.name}\nID: {product.product_id}\nValue: ${product.value}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


# Define Pydantic Models for API (unchanged, but now map to SQLAlchemy models)
class StatusCheck(BaseModel):
    id: str
    client_name: str
    timestamp: datetime

class StatusCheckCreate(BaseModel):
    client_name: str

class Product(BaseModel):
    id: str
    product_id: str
    name: str
    value: float
    stock: int
    printed_quantity: int
    qr_code_data: Optional[str]
    qr_code_image: Optional[str]
    status: str = "active"
    created_at: datetime
    updated_at: datetime

class ProductCreate(BaseModel):
    name: str
    value: float
    stock: int = 0
    printed_quantity: int = 0
    status: str = "active"

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[float] = None
    stock: Optional[int] = None
    printed_quantity: Optional[int] = None
    status: Optional[str] = None

class Ticket(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_value: float
    ticket_number: str
    quantity: int
    is_redeemed: bool
    created_at: datetime
    redeemed_at: Optional[datetime]

class TicketCreate(BaseModel):
    product_id: str
    quantity: int = 1

class TicketRedeem(BaseModel):
    ticket_id: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

from fastapi import Depends

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, db: Session = Depends(get_db)):
    db_status_check = DBStatusCheck(client_name=input.client_name)
    db.add(db_status_check)
    db.commit()
    db.refresh(db_status_check)
    return StatusCheck(**db_status_check.__dict__)

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(db: Session = Depends(get_db)):
    status_checks = db.query(DBStatusCheck).limit(1000).all()
    return [StatusCheck(**status_check.__dict__) for status_check in status_checks]

# Product Endpoints
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product with QR code"""
    
    # Generate a unique product_id
    new_product_id = str(uuid.uuid4())
    
    # Create product object
    db_product = DBProduct(
        product_id=new_product_id,
        name=product_data.name,
        value=product_data.value,
        stock=product_data.stock,
        printed_quantity=product_data.printed_quantity,
        status=product_data.status
    )
    
    # Generate QR code
    qr_data = f"Product: {db_product.name}\nID: {db_product.product_id}\nValue: ${db_product.value}"
    qr_image = generate_qr_code(db_product)
    
    # Update product with QR code data
    db_product.qr_code_data = qr_data
    db_product.qr_code_image = qr_image
    
    # Insert into database
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return Product(**db_product.__dict__)

@api_router.get("/products", response_model=List[Product])
async def get_products(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all products"""
    query = db.query(DBProduct)
    if status:
        query = query.filter(DBProduct.status == status)
    products = query.all()
    return [Product(**product.__dict__) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, db: Session = Depends(get_db)): # No change needed here, just ensuring it's in context
    """Get a specific product by product_id"""
    product = db.query(DBProduct).filter(DBProduct.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product.__dict__)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, update_data: ProductUpdate, db: Session = Depends(get_db)):
    """Update a product"""
    product = db.query(DBProduct).filter(DBProduct.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Prepare update data
    update_dict = update_data.dict(exclude_unset=True)
    
    # If name or value changed, regenerate QR code
    if "name" in update_dict or "value" in update_dict:
        # Create a temporary dict to generate QR code with updated values
        temp_product_data = product.__dict__.copy()
        temp_product_data.update(update_dict)
        qr_data = f"Product: {temp_product_data['name']}\nID: {temp_product_data['product_id']}\nValue: ${temp_product_data['value']}"
        qr_image = generate_qr_code(temp_product_data)
        update_dict["qr_code_data"] = qr_data
        update_dict["qr_code_image"] = qr_image
    
    
    if "status" in update_dict:
        product.status = update_dict["status"]
    if "printed_quantity" in update_dict:
        product.printed_quantity = update_dict["printed_quantity"]
    for key, value in update_dict.items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return Product(**product.__dict__)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, db: Session = Depends(get_db)):
    """Delete a product"""
    product = db.query(DBProduct).filter(DBProduct.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

from sqlalchemy.orm import Session

# Ticket Endpoints
@api_router.post("/tickets", response_model=List[Ticket])
async def create_tickets(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    """Create tickets for a product"""
    
    # Get product details
    product = db.query(DBProduct).filter(DBProduct.product_id == ticket_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status == 'inactive':
        raise HTTPException(status_code=400, detail="Cannot create tickets for an inactive product.")
    

    
    tickets = []
    for _ in range(ticket_data.quantity):
        db_ticket = DBTicket(
            product_id=product.product_id,
            product_name=product.name,
            product_value=product.value
        )
        db.add(db_ticket)
        tickets.append(db_ticket)
    
    product.printed_quantity += ticket_data.quantity
    db.add(product)
    db.commit()
    for ticket in tickets:
        db.refresh(ticket)
    db.refresh(product)
    return [Ticket(**ticket.__dict__) for ticket in tickets]

@api_router.get("/tickets", response_model=List[Ticket])
async def get_tickets(db: Session = Depends(get_db)):
    """Get all tickets"""
    tickets = db.query(DBTicket).limit(1000).all()
    return [Ticket(**ticket.__dict__) for ticket in tickets]

@api_router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    """Get a specific ticket by ticket_id"""
    ticket = db.query(DBTicket).filter(DBTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return Ticket(**ticket.__dict__)

@api_router.get("/tickets/product/{product_id}", response_model=List[Ticket])
async def get_tickets_by_product(product_id: str, db: Session = Depends(get_db)):
    """Get tickets for a specific product"""
    tickets = db.query(DBTicket).filter(DBTicket.product_id == product_id).all()
    return [Ticket(**ticket.__dict__) for ticket in tickets]

@api_router.post("/tickets/redeem", response_model=Ticket)
async def redeem_ticket(ticket_redeem: TicketRedeem, db: Session = Depends(get_db)):
    """Redeem a ticket"""
    ticket = db.query(DBTicket).filter(DBTicket.id == ticket_redeem.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.is_redeemed:
        raise HTTPException(status_code=400, detail="Ticket already redeemed")
    
    ticket.is_redeemed = True
    ticket.redeemed_at = datetime.utcnow()
    db.add(ticket)

    # Reduce product stock only if product is active
    product = db.query(DBProduct).filter(DBProduct.product_id == ticket.product_id).first()
    if product:
        if product.status == 'active':
            if product.stock >= ticket.quantity:
                product.stock -= ticket.quantity
                product.printed_quantity -= ticket.quantity
                db.add(product)
                db.commit()
                db.refresh(product)
            else:
                raise HTTPException(status_code=400, detail="Not enough stock to redeem this ticket")
        else:
            raise HTTPException(status_code=400, detail="Product is inactive and cannot be redeemed.")

    db.commit()
    db.refresh(ticket)
    if product:
        db.refresh(product)
    return Ticket(**ticket.__dict__)
    raise HTTPException(status_code=400, detail="Not enough stock available")
    
    # Create tickets
    tickets = []
    for _ in range(ticket_data.quantity):
        ticket = Ticket(
            product_id=product["product_id"],
            product_name=product["name"],
            product_value=product["value"],
            quantity=1
        )
        tickets.append(ticket)
    
    # Insert tickets into database
    tickets_dict = [ticket.dict() for ticket in tickets]
    await db.tickets.insert_many(tickets_dict)
    
    # Update product stock
    new_stock = product["stock"] - ticket_data.quantity
    await db.products.update_one(
        {"product_id": ticket_data.product_id},
        {"$set": {"stock": new_stock, "updated_at": datetime.utcnow()}}
    )
    
    return tickets

@api_router.get("/tickets", response_model=List[Ticket])
async def get_tickets():
    """Get all tickets"""
    tickets = await db.tickets.find().to_list(1000)
    return [Ticket(**ticket) for ticket in tickets]

@api_router.get("/tickets/product/{product_id}", response_model=List[Ticket])
async def get_tickets_by_product(product_id: str):
    """Get all tickets for a specific product"""
    tickets = await db.tickets.find({"product_id": product_id}).to_list(1000)
    return [Ticket(**ticket) for ticket in tickets]

@api_router.post("/tickets/redeem")
async def redeem_ticket(redeem_data: TicketRedeem):
    """Redeem a ticket (decrease stock)"""
    
    # Find the ticket
    ticket = await db.tickets.find_one({"id": redeem_data.ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket["is_redeemed"]:
        raise HTTPException(status_code=400, detail="Ticket already redeemed")
    
    # Mark ticket as redeemed
    await db.tickets.update_one(
        {"id": redeem_data.ticket_id},
        {"$set": {"is_redeemed": True, "redeemed_at": datetime.utcnow()}}
    )
    
    return {"message": "Ticket redeemed successfully"}

@api_router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str):
    """Get a specific ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return Ticket(**ticket)

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
