# EstateClear Backend - Person 1 (Identity & Access)

## Shared Authentication & Authorization Dependencies
For other developers (Person 2, 3, 4) who need to protect their endpoints, you can use the dependencies located in `backend.auth.dependencies`.

### `get_current_user`
Provides the currently authenticated user based on their JWT.
```python
from fastapi import Depends
from backend.models import User
from backend.auth.dependencies import get_current_user

@router.get("/my-profile")
def profile(current_user: User = Depends(get_current_user)):
    return {"user": current_user.email}
```

### `require_estate_access`
Ensures the user is authenticated and has an active membership (any role) in the specified estate. The endpoint must accept `estate_id: UUID` as a path or query parameter for this to work implicitly, or you can call it manually.
```python
from fastapi import Depends
from backend.auth.dependencies import require_estate_access

@router.post("/estates/{estate_id}/documents")
def upload_document(estate_id: UUID, membership = Depends(require_estate_access)):
    # The user has access (owner, executor, lawyer, accountant, or viewer)
    # The membership object contains their exact role
    pass
```

### `require_owner`
Ensures the user has the "owner" role specifically.
```python
from fastapi import Depends
from backend.auth.dependencies import require_owner

@router.post("/estates/{estate_id}/closure/schedule")
def schedule_closure(estate_id: UUID, membership = Depends(require_owner)):
    # Only the owner can reach this code
    pass
```
