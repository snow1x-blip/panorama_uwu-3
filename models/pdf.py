from sqlalchemy import Column, Integer, String
from database import Base


class Pdf(Base):
    __tablename__ = "presetnations"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    path_to_pdf = Column(String)
    user_name = Column(String, index=True)
