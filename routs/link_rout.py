from fastapi import APIRouter


router = APIRouter(
    tags=["link"],
    responses={404: {"description": "Not found"}},
)


@router.post("/link")
def generate_for_links(link: str):
    pass
