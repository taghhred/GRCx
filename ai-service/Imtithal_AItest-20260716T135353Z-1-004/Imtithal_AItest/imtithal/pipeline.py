# -*- coding: utf-8 -*-
"""خط التحليل الكامل — يجمع الطبقات الثلاث في استدعاء واحد.

الاستخدام:
    from imtithal.pipeline import ImtithalPipeline
    pipe = ImtithalPipeline()
    report = pipe.analyze("حساب admin بدون MFA في نظام الدفع")
"""
from __future__ import annotations

from .classifier import LocalClassifier
from .config import CATEGORY_AR
from .knowledge import get_knowledge
from .reporter import build_report, smart_layer
from .retriever import LegalRetriever


class ImtithalPipeline:
    def __init__(self, prefer_classifier: str | None = None,
                 prefer_retriever: str | None = None):
        self.classifier = LocalClassifier(prefer=prefer_classifier)
        self.retriever = LegalRetriever(prefer=prefer_retriever)
        self.llm = smart_layer()

    # معلومات المحرك لعرضها في الواجهة/التقرير
    def engine_info(self) -> dict:
        info = {
            "classifier": self.classifier.backend_name,
            "classifier_label": self.classifier.backend_label,
            "retriever": self.retriever.backend_name,
            "retriever_label": self.retriever.backend_label,
            "articles_count": len(self.retriever.articles),
            "llm": self.llm.status(),
            "classifier_errors": self.classifier.errors,
            "retriever_errors": self.retriever.errors,
            "model_path": self.classifier.model_path,
            "checkpoint": self.classifier.checkpoint,
        }
        return info

    @staticmethod
    def _expand_query(text: str, top_category: str) -> str:
        """توسيع الاستعلام بمصطلحات الفئة لرفع صلة المواد المسترجعة."""
        know = get_knowledge(top_category)
        terms = [know.get("title_ar", ""), CATEGORY_AR.get(top_category, ""),
                 top_category.replace("_", " ")]
        terms += [r["id"] for r in know.get("regulations", [])[:3]]
        terms += [r["title"] for r in know.get("regulations", [])[:2]]
        return text + " | " + " ".join(t for t in terms if t)

    def analyze(self, text: str, top_k_articles: int = 4,
                use_llm: bool = True, lang: str = "auto") -> dict:
        text = (text or "").strip()
        if not text:
            raise ValueError("النص فارغ")
        predictions = self.classifier.predict(text, top_k=3)
        query = self._expand_query(text, predictions[0]["category"])
        articles = self.retriever.search(query, top_k=top_k_articles)
        return build_report(text, predictions, articles,
                            engine_info=self.engine_info(), use_llm=use_llm,
                            lang=lang)
