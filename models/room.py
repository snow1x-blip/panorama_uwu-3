from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class Apartment(Base):
    __tablename__ = "apartments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    title = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    price_per_sqm = Column(Integer, nullable=True)
    address = Column(String, nullable=False)
    rooms = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    area = Column(Float, nullable=True)
    description = Column(String, nullable=True)
    
    images = Column(JSON, default=list)
    
    source = Column(String, nullable=True)
    url = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="apartments")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "price": self.price,
            "price_per_sqm": self.price_per_sqm,
            "address": self.address,
            "rooms": self.rooms,
            "floor": self.floor,
            "area": self.area,
            "description": self.description,
            "images": self.images,
            "source": self.source,
            "url": self.url,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
