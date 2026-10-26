from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

RoleName = Literal[
    "professor",
    "strict_examiner",
    "friendly_tutor",
    "interviewer",
    "coding_mentor",
    "custom",
]
Difficulty = Literal["easy", "medium", "hard"]
QuestionStyle = Literal["multiple_choice", "short_answer", "mixed"]
QuestionType = Literal["multiple_choice", "short_answer"]
SourceMode = Literal["live_topic", "my_material"]
QuestionCount = Literal[5, 10, 15, 20, 30]


class GenerationRequest(BaseModel):
    source_mode: SourceMode = "my_material"
    material: str = Field(default="", max_length=80_000)
    topic: str = Field(default="", max_length=160)
    role: RoleName = "professor"
    custom_role: str = Field(default="", max_length=500)
    difficulty: Difficulty = "medium"
    count: QuestionCount = 5
    style: QuestionStyle = "mixed"
    extra_instructions: str = Field(default="", max_length=1_000)
    model: str = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def require_selected_source(self) -> "GenerationRequest":
        if self.source_mode == "live_topic":
            if len(self.topic.strip()) < 2:
                raise ValueError("Enter a topic title with at least two characters.")
        elif len(self.material.strip()) < 20:
            raise ValueError("Provide at least 20 characters of notes or readable study material.")
        return self


class QuestionSpec(BaseModel):
    question: str = Field(min_length=8, max_length=1_000)
    type: QuestionType
    options: list[str] = Field(default_factory=list, max_length=6)
    correct_answer: str = Field(min_length=1, max_length=1_000)
    explanation: str = Field(min_length=1, max_length=1_500)
    topic: str = Field(default="General", max_length=160)
    difficulty: Difficulty = "medium"


class PublicQuestion(BaseModel):
    question_id: str
    question: str
    type: QuestionType
    options: list[str]
    topic: str
    difficulty: Difficulty


class SourceCitation(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    url: str = Field(pattern=r"^https://en\.wikipedia\.org/wiki/")


class GenerateResponse(BaseModel):
    quiz_id: str
    model: str
    questions: list[PublicQuestion]
    warning: str | None = None
    sources: list[SourceCitation] = Field(default_factory=list)


class EvaluationRequest(BaseModel):
    quiz_id: str = Field(min_length=8, max_length=100)
    question_id: str = Field(min_length=1, max_length=32)
    answer: str = Field(min_length=1, max_length=2_000)


class EvaluationResponse(BaseModel):
    quiz_id: str
    question_id: str
    status: Literal["correct", "partially_correct", "incorrect"]
    feedback: str
    expected_answer: str
    explanation: str


class HealthResponse(BaseModel):
    app: Literal["ok"] = "ok"
    ollama_connected: bool
    model_count: int = 0
    message: str | None = None


class ModelInfo(BaseModel):
    name: str
    size: int | None = None
    modified_at: str | None = None


class ModelsResponse(BaseModel):
    connected: bool
    models: list[ModelInfo]
    message: str | None = None


class IngestFileResult(BaseModel):
    name: str
    size: int
    status: Literal["success", "error"]
    content: str = ""
    message: str | None = None


class IngestResponse(BaseModel):
    files: list[IngestFileResult]
    content: str
    warning: str | None = None
