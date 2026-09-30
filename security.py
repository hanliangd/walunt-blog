from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError,InvalidHashError
ph = PasswordHasher()
def hash_password(password:str)->str:
  return ph.hash(password)
def verify_password(password:str,hashed:str)->bool:
  try:
    ph.verify(hashed, password)
    return True
  except VerifyMismatchError:
    return False
  except InvalidHashError: 
        return False
  except Exception as e: 
     print(f"验证失败: {e}")
     return False