from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class TurnbackEvent(BaseModel):
    """Detected modification or cancellation of previous statements."""
    type: Literal["SINGLE_CHANGE", "RETURN", "TOPIC_SWITCH", "NONE"] = Field(
        description="The type of turnback detected. SINGLE_CHANGE: value change, RETURN: revert to old value, TOPIC_SWITCH: topic change."
    )
    target_topic: str = Field(description="The topic that is being modified.")
    new_value: str = Field(description="The new proposed value or decision.")
    reason: str = Field(description="Reason for the change (e.g., 'Forgot context', 'Better alternative').")

class DecisionPoint(BaseModel):
    """A specific extracted decision or info point."""
    topic: str = Field(description="The main subject of this point (e.g., 'Login Button Color').")
    value: str = Field(description="The content/value of the decision (e.g., 'Blue').")
    status: Literal["PROPOSED", "AGREED", "REJECTED", "CONFIRMED"] = Field(description="Current status of this point.")

class MeaningAnalysis(BaseModel):
    """Output structure for the Meaning Filter Agent."""
    main_topics: List[str] = Field(description="List of active topics discussed in this segment.")
    decisions: List[DecisionPoint] = Field(description="Extracted decision points.")
    turnback: Optional[TurnbackEvent] = Field(description="If a turnback was detected, details about it.")
    is_chitchat: bool = Field(description="True if the segment is mostly non-productive chitchat.")
