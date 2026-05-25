"""
HealthWeave – Health Knowledge Graph
Graph-based medical intelligence layer.
Builds relationships between conditions, medicines, biomarkers, and risk factors.
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


@dataclass
class GraphNode:
    node_id: str
    node_type: str   # "condition" | "medicine" | "biomarker" | "symptom" | "risk_factor"
    label: str
    properties: dict = field(default_factory=dict)


@dataclass
class GraphEdge:
    source_id: str
    target_id: str
    relationship: str  # "treats" | "causes" | "indicates" | "correlates_with" | "risk_factor_for"
    weight: float = 1.0
    evidence: str = ""


class HealthKnowledgeGraph:
    """
    In-memory knowledge graph built dynamically from patient data.
    In production, replace with Neo4j or Neptune for scale.
    """

    def __init__(self):
        self.nodes: dict[str, GraphNode] = {}
        self.edges: list[GraphEdge] = []
        self._seed_medical_knowledge()

    def _seed_medical_knowledge(self):
        """Seed known medical relationships from evidence base."""
        # Condition → Biomarker relationships
        relationships = [
            # Diabetes
            ("type2_diabetes", "condition", "Type 2 Diabetes",
             "hba1c", "biomarker", "HbA1c", "indicates", 0.95),
            ("type2_diabetes", "condition", "Type 2 Diabetes",
             "fasting_glucose", "biomarker", "Fasting Glucose", "indicates", 0.90),
            # Cardiovascular
            ("hypertension", "condition", "Hypertension",
             "systolic_bp", "biomarker", "Systolic Blood Pressure", "indicates", 0.98),
            ("cardiovascular_risk", "risk_factor", "Cardiovascular Risk",
             "ldl_cholesterol", "biomarker", "LDL Cholesterol", "correlates_with", 0.85),
            ("cardiovascular_risk", "risk_factor", "Cardiovascular Risk",
             "hdl_cholesterol", "biomarker", "HDL Cholesterol", "inversely_correlates", 0.80),
            # Liver
            ("fatty_liver", "condition", "Fatty Liver Disease",
             "alt", "biomarker", "ALT", "indicates", 0.80),
            ("fatty_liver", "condition", "Fatty Liver Disease",
             "ast", "biomarker", "AST", "indicates", 0.75),
            # Kidney
            ("chronic_kidney_disease", "condition", "Chronic Kidney Disease",
             "creatinine", "biomarker", "Creatinine", "indicates", 0.92),
            ("chronic_kidney_disease", "condition", "Chronic Kidney Disease",
             "egfr", "biomarker", "eGFR", "indicates", 0.95),
            # Thyroid
            ("hypothyroidism", "condition", "Hypothyroidism",
             "tsh", "biomarker", "TSH", "indicates", 0.93),
            # Anemia
            ("iron_deficiency_anemia", "condition", "Iron Deficiency Anemia",
             "hemoglobin", "biomarker", "Hemoglobin", "indicates", 0.90),
            ("iron_deficiency_anemia", "condition", "Iron Deficiency Anemia",
             "ferritin", "biomarker", "Ferritin", "indicates", 0.88),
            # Metabolic syndrome
            ("metabolic_syndrome", "condition", "Metabolic Syndrome",
             "triglycerides", "biomarker", "Triglycerides", "indicates", 0.85),
            # Inflammation
            ("chronic_inflammation", "risk_factor", "Chronic Inflammation",
             "c_reactive_protein", "biomarker", "CRP", "indicates", 0.87),
        ]

        for (src_id, src_type, src_label,
             tgt_id, tgt_type, tgt_label,
             rel, weight) in relationships:
            self.add_node(GraphNode(src_id, src_type, src_label))
            self.add_node(GraphNode(tgt_id, tgt_type, tgt_label))
            self.edges.append(GraphEdge(src_id, tgt_id, rel, weight))

        # Medicine → Condition relationships
        medicine_conditions = [
            ("metformin", "medicine", "Metformin", "type2_diabetes", "treats", 0.99),
            ("amlodipine", "medicine", "Amlodipine", "hypertension", "treats", 0.95),
            ("atorvastatin", "medicine", "Atorvastatin", "cardiovascular_risk", "treats", 0.90),
            ("levothyroxine", "medicine", "Levothyroxine", "hypothyroidism", "treats", 0.98),
        ]
        for med_id, med_type, med_label, cond_id, rel, weight in medicine_conditions:
            self.add_node(GraphNode(med_id, med_type, med_label))
            self.edges.append(GraphEdge(med_id, cond_id, rel, weight))

    def add_node(self, node: GraphNode):
        if node.node_id not in self.nodes:
            self.nodes[node.node_id] = node

    def add_edge(self, edge: GraphEdge):
        self.edges.append(edge)

    def get_related_conditions(self, biomarker_name: str) -> list[dict]:
        """Given an abnormal biomarker, find related conditions."""
        related = []
        for edge in self.edges:
            if edge.target_id == biomarker_name and edge.relationship == "indicates":
                if edge.source_id in self.nodes:
                    node = self.nodes[edge.source_id]
                    if node.node_type == "condition":
                        related.append({
                            "condition": node.label,
                            "condition_id": node.node_id,
                            "confidence": edge.weight,
                        })
        return sorted(related, key=lambda x: x["confidence"], reverse=True)

    def get_related_biomarkers(self, condition_id: str) -> list[dict]:
        """Given a condition, find biomarkers that indicate it."""
        related = []
        for edge in self.edges:
            if edge.source_id == condition_id and edge.relationship in ("indicates", "correlates_with"):
                if edge.target_id in self.nodes:
                    node = self.nodes[edge.target_id]
                    if node.node_type == "biomarker":
                        related.append({
                            "biomarker": node.label,
                            "canonical_name": node.node_id,
                            "confidence": edge.weight,
                        })
        return related

    def get_treatment_medicines(self, condition_id: str) -> list[str]:
        """Find medicines that treat a condition."""
        medicines = []
        for edge in self.edges:
            if edge.target_id == condition_id and edge.relationship == "treats":
                if edge.source_id in self.nodes:
                    node = self.nodes[edge.source_id]
                    if node.node_type == "medicine":
                        medicines.append(node.label)
        return medicines

    async def enrich_with_patient_data(
        self, db: AsyncSession, user_id: UUID
    ) -> "HealthKnowledgeGraph":
        """
        Extend graph with patient-specific nodes and edges.
        Returns self for chaining.
        """
        # Add patient's diagnosed conditions
        conditions_sql = text("""
            SELECT DISTINCT unnest(icd10_codes) AS icd10_code, title
            FROM health_records
            WHERE user_id = :user_id AND cardinality(icd10_codes) > 0
        """)
        result = await db.execute(conditions_sql, {"user_id": str(user_id)})
        for row in result.mappings().all():
            node_id = f"patient_{row['icd10_code']}"
            self.add_node(GraphNode(node_id, "patient_condition", row["title"] or row["icd10_code"]))

        # Add patient's medicines
        meds_sql = text("""
            SELECT DISTINCT canonical_name, prescribed_for
            FROM medicine_entries
            WHERE user_id = :user_id AND canonical_name IS NOT NULL
        """)
        result = await db.execute(meds_sql, {"user_id": str(user_id)})
        for row in result.mappings().all():
            med_id = row["canonical_name"].lower().replace(" ", "_")
            self.add_node(GraphNode(med_id, "patient_medicine", row["canonical_name"]))

        return self

    def to_cytoscape_json(self) -> dict:
        """Export to Cytoscape.js format for frontend visualization."""
        elements = []
        for node in self.nodes.values():
            elements.append({
                "data": {
                    "id": node.node_id,
                    "label": node.label,
                    "type": node.node_type,
                }
            })
        for edge in self.edges:
            elements.append({
                "data": {
                    "source": edge.source_id,
                    "target": edge.target_id,
                    "relationship": edge.relationship,
                    "weight": edge.weight,
                }
            })
        return {"elements": elements}


# Singleton global graph (seeded with base medical knowledge)
_health_graph: HealthKnowledgeGraph | None = None


def get_health_graph() -> HealthKnowledgeGraph:
    global _health_graph
    if _health_graph is None:
        _health_graph = HealthKnowledgeGraph()
    return _health_graph
