from sqlalchemy import Column, Integer, String, DateTime
from database import Base


class Photo(Base):
    __tablename__ = "photos"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    path_to_photo = Column(String)
    user_name = Column(String, index=True)
