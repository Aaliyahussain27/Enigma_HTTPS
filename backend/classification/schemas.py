from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AmountsInfo(BaseModel):
    opening_balance: Optional[float] = Field(None, description="Opening balance if explicitly stated")
    closing_balance: Optional[float] = Field(None, description="Closing balance if explicitly stated")
    available_balance: Optional[float] = Field(None, description="Available balance if explicitly stated")
    outstanding_amount: Optional[float] = Field(None, description="Outstanding loan or credit amount if explicitly stated")
    principal_outstanding: Optional[float] = Field(None, description="Principal outstanding if explicitly stated")
    total_due: Optional[float] = Field(None, description="Total due amount if explicitly stated")
    minimum_due: Optional[float] = Field(None, description="Minimum due amount if explicitly stated")
    emi_amount: Optional[float] = Field(None, description="EMI amount if explicitly stated")
    policy_sum_assured: Optional[float] = Field(None, description="Insurance policy sum assured if explicitly stated")
    maturity_amount: Optional[float] = Field(None, description="Maturity amount if explicitly stated")

class StatementPeriod(BaseModel):
    start_date: Optional[str] = Field(None, description="Start date of the statement in YYYY-MM-DD")
    end_date: Optional[str] = Field(None, description="End date of the statement in YYYY-MM-DD")

class DocumentAction(BaseModel):
    title: str = Field(..., description="Action title")
    description: str = Field(..., description="Action description")
    priority: str = Field(..., description="Priority: CRITICAL, IMPORTANT, or CAN_WAIT")
    required_documents: List[str] = Field(default_factory=list, description="List of required documents for this action")

class DocumentAnalysis(BaseModel):
    document_type: str = Field(..., description="Type of document, e.g., bank_statement, loan_statement, insurance_policy, death_certificate, etc.")
    institution_name: Optional[str] = Field(None, description="Name of the institution (e.g., State Bank of India, LIC, HDFC)")
    account_holder: Optional[str] = Field(None, description="Name of the primary account holder / borrower / insured person")
    deceased_person: Optional[str] = Field(None, description="Name of the deceased person if explicitly mentioned (e.g., in a death certificate)")
    
    account_number: Optional[str] = Field(None, description="Bank account number or similar identifier")
    policy_number: Optional[str] = Field(None, description="Insurance policy number")
    loan_number: Optional[str] = Field(None, description="Loan account number")
    card_number: Optional[str] = Field(None, description="Credit card number (masked or full)")
    reference_number: Optional[str] = Field(None, description="Any other generic reference number")

    category: str = Field(..., description="Financial category: asset, liability, identity, tax, other")
    subcategory: Optional[str] = Field(None, description="Subcategory, e.g., savings_account, education_loan, life_insurance, etc.")

    amounts: AmountsInfo
    statement_period: Optional[StatementPeriod] = None
    dates: Dict[str, str] = Field(default_factory=dict, description="Key dates extracted (e.g., maturity_date, due_date)")

    nominee_information: Optional[str] = Field(None, description="Name of the nominee if explicitly stated")
    beneficiary_information: Optional[str] = Field(None, description="Name of the beneficiary if explicitly stated")

    actions: List[DocumentAction] = Field(default_factory=list, description="Recommended actions based on this document")
    required_documents: List[str] = Field(default_factory=list, description="Documents required to process/claim this asset/liability")

    summary: str = Field(..., description="A 1-2 sentence human-readable summary of what this document is and its current state")
    warnings: List[str] = Field(default_factory=list, description="Any warnings, e.g., 'Current outstanding loan amount cannot be established from this statement alone.'")
    
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")
