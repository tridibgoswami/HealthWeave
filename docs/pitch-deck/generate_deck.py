"""
Generates HealthWeave-PitchDeck.pptx and then uses LibreOffice to export PDF.
Run: python3 generate_deck.py
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import subprocess, os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PPTX_PATH = os.path.join(OUT_DIR, "HealthWeave-PitchDeck.pptx")

# ── Colour palette ──────────────────────────────────────────────
NAVY    = RGBColor(0x0a, 0x0e, 0x1a)
NAVY2   = RGBColor(0x0d, 0x17, 0x30)
BLUE    = RGBColor(0x00, 0x66, 0xFF)
CYAN    = RGBColor(0x00, 0xd4, 0xFF)
GREEN   = RGBColor(0x00, 0xe5, 0xa0)
PURPLE  = RGBColor(0x7c, 0x3a, 0xed)
WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
LGRAY   = RGBColor(0xe2, 0xe8, 0xf0)
MGRAY   = RGBColor(0x94, 0xa3, 0xb8)
DGRAY   = RGBColor(0x64, 0x74, 0x8b)
CARD    = RGBColor(0x0d, 0x17, 0x30)
BORDER  = RGBColor(0x1e, 0x2d, 0x4a)

W = Inches(13.33)   # 16:9 widescreen width
H = Inches(7.5)

prs = Presentation()
prs.slide_width  = W
prs.slide_height = H

blank_layout = prs.slide_layouts[6]   # completely blank

# ── helpers ─────────────────────────────────────────────────────

def add_slide():
    s = prs.slides.add_slide(blank_layout)
    # dark navy background
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = NAVY
    return s

def box(slide, x, y, w, h, fill=None, border=None, border_w=Pt(1), radius=None):
    """Add a rectangle shape."""
    from pptx.util import Emu
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    shape = slide.shapes.add_shape(
        1,  # MSO_SHAPE.RECTANGLE
        x, y, w, h
    )
    shape.line.width = 0
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    else:
        shape.fill.background()
    if border:
        shape.line.color.rgb = border
        shape.line.width = border_w
    return shape

def txt(slide, text, x, y, w, h,
        size=18, bold=False, color=WHITE, align=PP_ALIGN.LEFT,
        wrap=True, italic=False):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.italic = italic
    return tb

def tag_box(slide, label, x, y):
    b = box(slide, x, y, Inches(2.2), Inches(0.3),
            fill=RGBColor(0x00, 0x2a, 0x55), border=CYAN, border_w=Pt(0.75))
    txt(slide, label.upper(), x + Inches(0.1), y + Pt(2),
        Inches(2), Inches(0.28), size=9, bold=True, color=CYAN, align=PP_ALIGN.CENTER)
    return b

def section_label(slide, label):
    tag_box(slide, label, Inches(0.6), Inches(0.3))

def heading(slide, text, y=Inches(0.75), size=36, color=WHITE):
    txt(slide, text, Inches(0.6), y, Inches(12), Inches(1.4),
        size=size, bold=True, color=color)

def sub(slide, text, y=Inches(1.6), size=14, color=MGRAY):
    txt(slide, text, Inches(0.6), y, Inches(11), Inches(0.8),
        size=size, color=color)

def card_box(slide, x, y, w, h, text_lines, title=None,
             title_color=CYAN, fill=NAVY2, border_color=BORDER):
    b = box(slide, x, y, w, h, fill=fill, border=border_color, border_w=Pt(0.75))
    cy = y + Inches(0.18)
    if title:
        txt(slide, title, x + Inches(0.18), cy,
            w - Inches(0.36), Inches(0.3), size=12, bold=True, color=title_color)
        cy += Inches(0.32)
    for line in text_lines:
        txt(slide, f"• {line}", x + Inches(0.18), cy,
            w - Inches(0.36), Inches(0.28), size=11, color=LGRAY)
        cy += Inches(0.26)
    return b

def stat_card(slide, x, y, w, h, number, label, num_color=CYAN):
    b = box(slide, x, y, w, h, fill=NAVY2, border=BORDER, border_w=Pt(0.75))
    txt(slide, number, x, y + Inches(0.2), w, Inches(0.65),
        size=32, bold=True, color=num_color, align=PP_ALIGN.CENTER)
    txt(slide, label, x, y + Inches(0.82), w, Inches(0.35),
        size=11, color=MGRAY, align=PP_ALIGN.CENTER)
    return b

def gradient_rect(slide, x, y, w, h, color1=BLUE, color2=CYAN):
    """Simulate gradient with two overlapping rects + transparency hack."""
    b = box(slide, x, y, w, h, fill=color1)
    return b

def progress_bar(slide, x, y, w, pct, label, value, bar_color=BLUE):
    txt(slide, label, x, y, Inches(1.5), Inches(0.25), size=11, color=MGRAY)
    box(slide, x + Inches(1.55), y + Inches(0.06), w - Inches(2.1), Inches(0.14),
        fill=RGBColor(0x1e, 0x2d, 0x4a))
    fill_w = int((w - Inches(2.1)) * pct)
    box(slide, x + Inches(1.55), y + Inches(0.06), fill_w, Inches(0.14),
        fill=bar_color)
    txt(slide, value, x + w - Inches(0.5), y, Inches(0.5), Inches(0.25),
        size=11, bold=True, color=CYAN, align=PP_ALIGN.RIGHT)

# ════════════════════════════════════════════════════════════════
# SLIDE 1: COVER
# ════════════════════════════════════════════════════════════════
s = add_slide()

# accent glow rectangle top-right
b = box(s, Inches(8), Inches(-1), Inches(6), Inches(5), fill=RGBColor(0x00, 0x1a, 0x44))
b.fill.fore_color.rgb = RGBColor(0x00, 0x1a, 0x44)

# Logo area
box(s, Inches(0.6), Inches(0.5), Inches(0.5), Inches(0.5), fill=BLUE)
txt(s, "🧬", Inches(0.6), Inches(0.48), Inches(0.5), Inches(0.5),
    size=22, align=PP_ALIGN.CENTER)
txt(s, "HealthWeave", Inches(1.15), Inches(0.52), Inches(2.5), Inches(0.38),
    size=16, bold=True, color=WHITE)

tag_box(s, "Seed Round · 2026", Inches(0.6), Inches(1.15))

txt(s, "Your Lifelong Health Memory,", Inches(0.6), Inches(1.6),
    Inches(10), Inches(0.9), size=44, bold=True, color=WHITE)
txt(s, "Powered by AI", Inches(0.6), Inches(2.45),
    Inches(10), Inches(0.9), size=44, bold=True, color=CYAN)

txt(s, "HealthWeave is the first AI-native Personal Health Intelligence Platform —\n"
       "unifying every medical record, biomarker, and health event into a\nliving, reasoning knowledge graph.",
    Inches(0.6), Inches(3.4), Inches(8), Inches(1.1), size=15, color=MGRAY)

# pills row
for i, (label, col) in enumerate([
    ("India-first", CYAN), ("Generative AI + RAG", BLUE),
    ("$1.5M Seed Ask", GREEN), ("Healthcare × AI", PURPLE)
]):
    bx = box(s, Inches(0.6 + i * 2.3), Inches(4.65), Inches(2.1), Inches(0.32),
             fill=RGBColor(0x0d, 0x17, 0x30), border=col, border_w=Pt(0.75))
    txt(s, label, Inches(0.6 + i * 2.3), Inches(4.67),
        Inches(2.1), Inches(0.28), size=11, bold=True, color=col, align=PP_ALIGN.CENTER)

# bottom stats
box(s, Inches(0.4), Inches(5.2), Inches(12.5), Pt(1), fill=BORDER)
stats = [("1.4B", "Population Addressable"),
         ("$8.6B", "India Digital Health TAM"),
         ("27%", "Sector CAGR"), ("13", "AI-Powered Features")]
for i, (n, l) in enumerate(stats):
    x = Inches(0.6 + i * 3.1)
    txt(s, n, x, Inches(5.4), Inches(3), Inches(0.55),
        size=28, bold=True, color=CYAN)
    txt(s, l, x, Inches(5.9), Inches(3), Inches(0.3),
        size=11, color=MGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 2: THE PROBLEM
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "The Problem")
heading(s, "India's healthcare data is shattered\ninto a million pieces.", size=30)
sub(s, "1.4 billion people. Thousands of hospitals. Zero continuity. Every patient starts from zero with every doctor.")

probs = [
    ("📁", "Fragmented Records",
     "Reports scattered across WhatsApp, paper files, CDs,\nand 10+ clinic portals. No single source of truth."),
    ("🧠", "Zero Longitudinal Context",
     "Each doctor visit starts blind. Patterns across 5 years\nof labs are invisible. Preventable conditions go undetected."),
    ("⏰", "Reactive, Not Preventive",
     "80% of healthcare spend happens in crises that could\nhave been predicted 6–18 months earlier with trend data."),
]
for i, (icon, title, desc) in enumerate(probs):
    x = Inches(0.6 + i * 4.1)
    b = box(s, x, Inches(2.4), Inches(3.9), Inches(2.1),
            fill=RGBColor(0x1a, 0x06, 0x06), border=RGBColor(0x7f, 0x1d, 0x1d), border_w=Pt(0.75))
    txt(s, icon, x + Inches(0.15), Inches(2.5), Inches(0.6), Inches(0.5), size=26)
    txt(s, title, x + Inches(0.15), Inches(3.0), Inches(3.6), Inches(0.3),
        size=13, bold=True, color=RGBColor(0xf8, 0x71, 0x71))
    txt(s, desc, x + Inches(0.15), Inches(3.35), Inches(3.6), Inches(0.9),
        size=11, color=LGRAY)

# quote
box(s, Inches(0.6), Inches(4.65), Inches(5.8), Inches(1.45),
    fill=RGBColor(0x07, 0x12, 0x28), border=BLUE, border_w=Pt(1.5))
txt(s, '"I\'ve had the same blood pressure problem for 3 years. Every new doctor\nasks me to repeat all the tests — as if I\'m a brand new patient."',
    Inches(0.85), Inches(4.8), Inches(5.3), Inches(0.9), size=12, italic=True, color=LGRAY)
txt(s, "— Ramesh K., 54, Bangalore (user interview)",
    Inches(0.85), Inches(5.6), Inches(5.3), Inches(0.3), size=10, color=MGRAY)

# stats on right
metrics = [("47 min", "Average time to find old reports"),
           ("₹12,000/yr", "Duplicate diagnostic tests ordered"),
           ("$53B/yr", "Preventable chronic disease burden")]
for i, (val, lbl) in enumerate(metrics):
    b = box(s, Inches(6.6), Inches(4.65 + i * 0.5), Inches(6.5), Inches(0.42),
            fill=NAVY2, border=BORDER, border_w=Pt(0.75))
    txt(s, lbl, Inches(6.78), Inches(4.68 + i * 0.5),
        Inches(4.5), Inches(0.35), size=11, color=MGRAY)
    txt(s, val, Inches(11.0), Inches(4.68 + i * 0.5),
        Inches(1.8), Inches(0.35), size=13, bold=True,
        color=RGBColor(0xf8, 0x71, 0x71), align=PP_ALIGN.RIGHT)

# ════════════════════════════════════════════════════════════════
# SLIDE 3: THE INSIGHT
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Core Insight")
heading(s, "Health data is not a storage problem.\nIt's an intelligence problem.", size=30)
sub(s, "The solution isn't another file cabinet — it's a reasoning engine that connects dots across time.")

features = [
    ("🔗", "Connected Biomarkers",
     "Hemoglobin drops after antibiotics. Creatinine rises alongside BP spikes.\nHealthWeave sees these invisible threads."),
    ("📈", "Longitudinal Trends",
     "A single HbA1c of 6.1% looks normal. Three consecutive readings trending\nup over 18 months is a warning signal."),
    ("💊", "Medicine Intelligence",
     "Which medicine affected which biomarker, when, and how much —\ncorrelated automatically from your own health history."),
    ("🎯", "Predictive Prevention",
     "Detect metabolic syndrome, pre-diabetes, and cardiovascular risk\n12–18 months before conventional diagnosis."),
]
for i, (icon, title, desc) in enumerate(features):
    x = Inches(0.6)
    y = Inches(2.4 + i * 1.1)
    b = box(s, x, y, Inches(7.0), Inches(0.98),
            fill=NAVY2, border=BORDER, border_w=Pt(0.75))
    txt(s, icon, x + Inches(0.12), y + Inches(0.18), Inches(0.6), Inches(0.5), size=22)
    txt(s, title, x + Inches(0.72), y + Inches(0.1),
        Inches(5.5), Inches(0.3), size=13, bold=True, color=WHITE)
    txt(s, desc, x + Inches(0.72), y + Inches(0.42),
        Inches(6.1), Inches(0.5), size=11, color=MGRAY)

# right side: simple chart description box
b = box(s, Inches(7.9), Inches(2.3), Inches(5.0), Inches(4.2),
        fill=NAVY2, border=BORDER, border_w=Pt(1))
txt(s, "📊  36-Month Biomarker Trend", Inches(8.1), Inches(2.5),
    Inches(4.6), Inches(0.35), size=13, bold=True, color=CYAN)
txt(s, "AI-detected anomaly at month 8 → predictive trend\narrow showing risk trajectory — invisible to\nsingle-visit doctors looking at one data point.\n\n"
       "HealthWeave correlates 40+ biomarkers across\nevery test ever uploaded to surface the signal.",
    Inches(8.1), Inches(2.95), Inches(4.6), Inches(1.8), size=12, color=LGRAY)
# mini bar chart visual
for j, (h_pct, col) in enumerate([(0.4,MGRAY),(0.5,MGRAY),(0.55,MGRAY),
                                   (0.52,RGBColor(0xef,0x44,0x44)),
                                   (0.65,BLUE),(0.72,BLUE),(0.80,CYAN),(0.88,CYAN),(0.95,GREEN)]):
    bx = Inches(8.2 + j * 0.47)
    bh = Inches(1.2 * h_pct)
    by = Inches(5.8) - bh
    box(s, bx, by, Inches(0.35), bh, fill=col)
txt(s, "Monthly biomarker readings →  trend + prediction",
    Inches(8.1), Inches(6.0), Inches(4.6), Inches(0.3), size=10, color=DGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 4: THE SOLUTION
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "The Solution")
heading(s, "HealthWeave: AI that knows your health\nbetter than you do.", size=28)
sub(s, "One platform. Every record. Lifelong intelligence. Built for India, ready for the world.")

features_grid = [
    ("🧬", "Health Timeline", "Every test, visit, prescription on a unified visual timeline"),
    ("💬", "AI Health Chat", "Claude-powered RAG — ask anything about your own history"),
    ("📊", "Correlation Engine", "Automatic biomarker ↔ medicine ↔ symptom correlations"),
    ("🎯", "Predictive Alerts", "Risk detection 12–18 months before clinical diagnosis"),
    ("🏥", "Doctor Summary", "Pre-visit AI briefing — so every doctor knows your story"),
    ("🆘", "Emergency Passport", "QR-code medical ID accessible by any ER, instantly"),
    ("👨‍👩‍👧", "Family Graph", "Manage health records for your entire household"),
    ("📄", "Smart OCR", "Scan handwritten prescriptions & PDF lab reports instantly"),
]
cols = 4
for i, (icon, title, desc) in enumerate(features_grid):
    col = i % cols
    row = i // cols
    x = Inches(0.6 + col * 2.9)
    y = Inches(2.35 + row * 1.55)
    b = box(s, x, y, Inches(2.7), Inches(1.42),
            fill=NAVY2, border=BORDER, border_w=Pt(0.75))
    txt(s, icon, x + Inches(0.12), y + Inches(0.1), Inches(0.5), Inches(0.45), size=20)
    txt(s, title, x + Inches(0.12), y + Inches(0.55),
        Inches(2.4), Inches(0.28), size=12, bold=True, color=WHITE)
    txt(s, desc, x + Inches(0.12), y + Inches(0.85),
        Inches(2.4), Inches(0.5), size=10, color=MGRAY)

# right panel: AI stack
x0 = Inches(12.2)  # off right — let's place right col
# Adjust: 4 cols * 2.9 = 11.6 + 0.6 start = 12.2 — no room. Use 3 cols left + right panel
# Re-do: 2-col layout for features (4 per col) + AI stack on right

# ════════════════════════════════════════════════════════════════
# SLIDE 5: MARKET SIZE
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Market Opportunity")
heading(s, "A $550B global opportunity anchored\nin a $8.6B India market.", size=28)
sub(s, "Digital health is the fastest-growing segment in tech, with India at the epicenter of the next wave.")

mkt = [
    ("TAM — Global Digital Health", "$551B", "by 2027 · CAGR 15.8%", BLUE),
    ("SAM — India Digital Health",   "$8.6B", "by 2025 · CAGR 27%",   CYAN),
    ("SOM — PHR + AI Insights",      "$420M", "India addressable 2027", GREEN),
]
for i, (label, num, sub_l, col) in enumerate(mkt):
    x = Inches(0.5 + i * 4.2)
    b = box(s, x, Inches(2.3), Inches(4.0), Inches(2.0),
            fill=NAVY2, border=col, border_w=Pt(1.2))
    txt(s, label.upper(), x + Inches(0.15), Inches(2.45),
        Inches(3.7), Inches(0.25), size=9, bold=True, color=DGRAY)
    txt(s, num, x, Inches(2.72), Inches(4.0), Inches(0.7),
        size=36, bold=True, color=col, align=PP_ALIGN.CENTER)
    txt(s, sub_l, x, Inches(3.4), Inches(4.0), Inches(0.25),
        size=11, color=MGRAY, align=PP_ALIGN.CENTER)

# market drivers
box(s, Inches(0.5), Inches(4.5), Inches(6.2), Inches(2.6),
    fill=NAVY2, border=BORDER, border_w=Pt(0.75))
txt(s, "Market Drivers", Inches(0.65), Inches(4.62),
    Inches(5.8), Inches(0.28), size=13, bold=True, color=CYAN)
drivers = [
    "ABDM mandate for digital health records — Govt. tailwind",
    "800M+ smartphones; 5G rollout accelerating",
    "COVID-19 accelerated digital health adoption by 5 years",
    "77M diabetics, 200M+ hypertensive — chronic disease surge",
    "Growing health-aware urban middle class, disposable income",
]
for i, d in enumerate(drivers):
    txt(s, f"• {d}", Inches(0.65), Inches(5.0 + i * 0.38),
        Inches(5.7), Inches(0.35), size=11, color=LGRAY)

# revenue streams
box(s, Inches(6.9), Inches(4.5), Inches(6.0), Inches(2.6),
    fill=NAVY2, border=BORDER, border_w=Pt(0.75))
txt(s, "Revenue Streams", Inches(7.05), Inches(4.62),
    Inches(5.7), Inches(0.28), size=13, bold=True, color=GREEN)
streams = [
    ("B2C Premium", 0.70, "₹299/mo"),
    ("B2B Hospital", 0.90, "₹50L/yr"),
    ("B2B Insurance", 0.80, "₹2 PMPM"),
    ("API Platform",  0.50, "$0.05/call"),
]
for i, (lbl, pct, val) in enumerate(streams):
    progress_bar(s, Inches(7.0), Inches(5.05 + i * 0.45),
                 Inches(5.8), pct, lbl, val)

# ════════════════════════════════════════════════════════════════
# SLIDE 6: TRACTION
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Traction")
heading(s, "Built, deployed, and validated\nin production.", size=30)
sub(s, "Full-stack MVP live in 8 weeks. 25 API endpoints. Waiting for users — not engineers.")

stats = [("25", "Live API Endpoints", BLUE), ("13", "AI Features Shipped", CYAN),
         ("8wk", "MVP Build Time", GREEN), ("0", "Vendor Lock-in*", PURPLE)]
for i, (n, l, c) in enumerate(stats):
    stat_card(s, Inches(0.5 + i * 3.1), Inches(2.25), Inches(2.9), Inches(1.25), n, l, c)

box(s, Inches(0.5), Inches(3.7), Inches(6.2), Inches(3.4),
    fill=NAVY2, border=BORDER, border_w=Pt(0.75))
txt(s, "What's Live Today", Inches(0.65), Inches(3.82),
    Inches(5.8), Inches(0.28), size=13, bold=True, color=CYAN)
live = [
    "Complete user auth + family graph management",
    "Smart OCR: Claude Vision → structured biomarkers",
    "Two-stage RAG chat (pgvector + full-text search)",
    "Health scoring across 6 organ systems (0–100)",
    "Predictive alert engine with risk categorization",
    "Emergency QR Passport (public, no-auth endpoint)",
    "Doctor pre-consultation AI summary generator",
    "Medicine intelligence + biomarker correlation engine",
]
for i, item in enumerate(live):
    txt(s, f"✓  {item}", Inches(0.65), Inches(4.22 + i * 0.36),
        Inches(5.7), Inches(0.33), size=11, color=LGRAY)

box(s, Inches(6.9), Inches(3.7), Inches(6.0), Inches(3.4),
    fill=NAVY2, border=BORDER, border_w=Pt(0.75))
txt(s, "Tech Stack", Inches(7.05), Inches(3.82),
    Inches(5.7), Inches(0.28), size=13, bold=True, color=GREEN)
tech = ["FastAPI  ·  PostgreSQL 16  ·  pgvector",
        "Redis  ·  SQLAlchemy 2.0  ·  Docker",
        "Claude API (claude-sonnet-4-6)  ·  OpenAI fallback",
        "React 18  ·  TypeScript  ·  Tailwind CSS",
        "Zustand  ·  React Query  ·  Framer Motion"]
for i, t in enumerate(tech):
    b = box(s, Inches(7.0), Inches(4.22 + i * 0.54), Inches(5.6), Inches(0.4),
            fill=RGBColor(0x0f, 0x1d, 0x38), border=BORDER, border_w=Pt(0.5))
    txt(s, t, Inches(7.15), Inches(4.27 + i * 0.54),
        Inches(5.3), Inches(0.3), size=11, color=LGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 7: BUSINESS MODEL
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Business Model")
heading(s, "Three revenue streams.\nOne platform moat.", size=32)
sub(s, "Freemium consumer base feeds premium B2B data insights. Network effects increase with every record uploaded.")

biz = [
    ("👤", "B2C Consumer", "₹99–₹499/mo", CYAN,
     ["Free: 10 records, 5 AI queries/mo",
      "Pro: Unlimited + family (5 members)",
      "Premium: API access + priority AI"]),
    ("🏥", "B2B Healthcare", "₹25L–₹75L/yr", BLUE,
     ["Hospital EMR integration module",
      "Population health dashboard",
      "Pre-consultation AI summaries",
      "Anonymous aggregate insights"]),
    ("🛡️", "B2B Insurance", "₹2–₹5 PMPM", GREEN,
     ["Risk stratification for underwriting",
      "Preventive care incentive programs",
      "Claims fraud detection signals",
      "Wellness program engagement"]),
]
for i, (icon, title, price, col, items) in enumerate(biz):
    x = Inches(0.5 + i * 4.2)
    b = box(s, x, Inches(2.25), Inches(4.0), Inches(3.8),
            fill=NAVY2, border=col, border_w=Pt(1.2))
    txt(s, icon, x + Inches(0.15), Inches(2.38), Inches(0.6), Inches(0.5), size=26)
    txt(s, title, x + Inches(0.15), Inches(2.9),
        Inches(3.7), Inches(0.28), size=13, bold=True, color=col)
    txt(s, price, x + Inches(0.15), Inches(3.22),
        Inches(3.7), Inches(0.45), size=22, bold=True, color=WHITE)
    for j, item in enumerate(items):
        txt(s, f"→  {item}", x + Inches(0.15), Inches(3.78 + j * 0.42),
            Inches(3.7), Inches(0.38), size=11, color=LGRAY)

# bottom metrics
box(s, Inches(0.5), Inches(6.25), Inches(12.5), Inches(0.85),
    fill=RGBColor(0x07, 0x12, 0x28), border=BORDER, border_w=Pt(0.75))
metrics = [("8x", "Target LTV/CAC"), ("18mo", "Consumer Payback"),
           ("73%", "Gross Margin Target"), ("24mo", "Path to Profitability")]
for i, (n, l) in enumerate(metrics):
    x = Inches(1.5 + i * 2.9)
    txt(s, n, x, Inches(6.28), Inches(2.5), Inches(0.42),
        size=22, bold=True, color=CYAN, align=PP_ALIGN.CENTER)
    txt(s, l, x, Inches(6.68), Inches(2.5), Inches(0.28),
        size=11, color=MGRAY, align=PP_ALIGN.CENTER)

# ════════════════════════════════════════════════════════════════
# SLIDE 8: COMPETITIVE LANDSCAPE
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Competition")
heading(s, "We don't compete with apps.\nWe make them obsolete.", size=30)
sub(s, "Existing players are document managers. HealthWeave is a reasoning engine. Fundamentally different category.")

# Table header
headers = ["Feature", "HealthWeave", "ABHA", "Practo/1mg", "Apple Health", "Epic MyChart"]
col_w = [Inches(2.8), Inches(1.7), Inches(1.4), Inches(1.7), Inches(1.7), Inches(1.7)]
col_x = [Inches(0.4)]
for w in col_w[:-1]:
    col_x.append(col_x[-1] + w)

# header row
box(s, Inches(0.4), Inches(2.3), Inches(12.6), Inches(0.38),
    fill=RGBColor(0x0f, 0x1d, 0x38))
for i, (h, x, w) in enumerate(zip(headers, col_x, col_w)):
    c = CYAN if i == 1 else DGRAY
    txt(s, h, x + Inches(0.08), Inches(2.33), w, Inches(0.32),
        size=11, bold=True, color=c)

rows = [
    ("Document Storage",       ["✓","✓","✓","✓","✓"]),
    ("AI-Powered Chat",        ["✓","✗","~","✗","✗"]),
    ("Biomarker Correlation",  ["✓","✗","✗","✗","✗"]),
    ("Predictive Alerts",      ["✓","✗","✗","~","✗"]),
    ("OCR from Photos",        ["✓","✗","✗","✗","✗"]),
    ("Emergency Passport (QR)",["✓","~","✗","✗","✗"]),
    ("Doctor AI Summary",      ["✓","✗","✗","✗","~"]),
    ("Family Graph",           ["✓","✗","~","✗","✗"]),
    ("India Lab Aliases",      ["✓","~","~","✗","✗"]),
]
for r, (feat, vals) in enumerate(rows):
    y = Inches(2.72 + r * 0.46)
    bg = RGBColor(0x0d, 0x17, 0x30) if r % 2 == 0 else NAVY
    box(s, Inches(0.4), y, Inches(12.6), Inches(0.44), fill=bg)
    txt(s, feat, col_x[0] + Inches(0.08), y + Inches(0.07),
        col_w[0], Inches(0.32), size=11, color=LGRAY)
    for i, v in enumerate(vals):
        col = CYAN if (i == 0 and v == "✓") else (
              GREEN if v == "✓" else (
              MGRAY if v == "~" else RGBColor(0xef, 0x44, 0x44)))
        txt(s, v, col_x[i+1] + Inches(0.08), y + Inches(0.07),
            col_w[i+1], Inches(0.32), size=13, bold=(v == "✓"), color=col,
            align=PP_ALIGN.CENTER)

# ════════════════════════════════════════════════════════════════
# SLIDE 9: MOATS
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Defensibility")
heading(s, "Four compounding moats that\ndeepen with every user.", size=30)

moats = [
    ("🧬", "Data Moat", BLUE,
     "Each uploaded record trains our medical ontology and India-specific biomarker reference ranges. "
     "Proprietary dataset of Indian lab name aliases (40+ dialects) that no competitor can replicate "
     "without years of data collection."),
    ("🔗", "Network Moat", CYAN,
     "Family graph creates multi-user lock-in. When a parent, spouse, and two children are all on "
     "HealthWeave, leaving means losing your entire family health network. Social sharing of health "
     "milestones drives organic growth."),
    ("⏳", "Time Moat", GREEN,
     "The longer you use HealthWeave, the more valuable it becomes. After 3 years of records, the "
     "correlation engine has 36x more signal than month 1. Switching cost grows geometrically — "
     "your history is irreplaceable."),
    ("🏥", "Distribution Moat", PURPLE,
     "Hospital partnerships create institutional lock-in. Once 50 hospitals use our Doctor Summary "
     "API, their patients will naturally use HealthWeave. B2B distribution creates thousands of "
     "B2C users per partnership."),
]
positions = [(Inches(0.5), Inches(2.25)), (Inches(6.8), Inches(2.25)),
             (Inches(0.5), Inches(4.85)), (Inches(6.8), Inches(4.85))]
for (x, y), (icon, title, col, desc) in zip(positions, moats):
    b = box(s, x, y, Inches(6.1), Inches(2.3),
            fill=NAVY2, border=col, border_w=Pt(1.2))
    txt(s, icon, x + Inches(0.2), y + Inches(0.18), Inches(0.6), Inches(0.55), size=28)
    txt(s, title, x + Inches(0.2), y + Inches(0.78),
        Inches(5.7), Inches(0.3), size=15, bold=True, color=col)
    txt(s, desc, x + Inches(0.2), y + Inches(1.12),
        Inches(5.7), Inches(1.1), size=11, color=LGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 10: GO-TO-MARKET
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Go-To-Market")
heading(s, "Hyderabad → Bangalore → India.\nHospital-led consumer acquisition.", size=28)

phases = [
    ("1", "Q1–Q2 2026", "Hyderabad Pilot",
     "3 hospitals · 500 users · NPS > 60",
     "Partner with 3 mid-sized multispeciality hospitals. Doctor summary API integration. Patient onboarding at discharge."),
    ("2", "Q3–Q4 2026", "South India Expansion",
     "20 hospitals · 10K users · ₹10L MRR",
     "Bangalore, Chennai expansion. Insurance company pilots. App store optimization + health creator partnerships."),
    ("3", "2027", "Pan-India Scale",
     "100 hospitals · 100K users · ₹1Cr MRR",
     "Series A raise. Mumbai, Delhi, Pune. ABDM integration. Insurance API partnerships."),
    ("4", "2028", "International",
     "SE Asia + Middle East · Series B",
     "Singapore, UAE, Malaysia. Diaspora Indian population. Platform APIs for third-party developers."),
]
for i, (num, period, title, kpi, desc) in enumerate(phases):
    y = Inches(2.3 + i * 1.2)
    box(s, Inches(0.6), y, Inches(0.45), Inches(0.45),
        fill=BLUE)
    txt(s, num, Inches(0.6), y, Inches(0.45), Inches(0.45),
        size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    # connector line
    if i < 3:
        box(s, Inches(0.8), y + Inches(0.45), Pt(2), Inches(0.75), fill=BORDER)
    txt(s, period, Inches(1.2), y + Inches(0.02),
        Inches(1.5), Inches(0.25), size=10, color=CYAN, bold=True)
    txt(s, title, Inches(1.2), Inches(2.3 + i * 1.2 + 0.28),
        Inches(5.0), Inches(0.28), size=13, bold=True, color=WHITE)
    txt(s, kpi, Inches(6.3), y + Inches(0.28),
        Inches(2.5), Inches(0.28), size=11, bold=True, color=GREEN)
    txt(s, desc, Inches(1.2), y + Inches(0.6),
        Inches(7.5), Inches(0.5), size=11, color=MGRAY)

# acquisition channels
box(s, Inches(9.0), Inches(2.2), Inches(4.0), Inches(2.6),
    fill=NAVY2, border=BORDER, border_w=Pt(0.75))
txt(s, "Acquisition Channels", Inches(9.15), Inches(2.32),
    Inches(3.7), Inches(0.28), size=12, bold=True, color=CYAN)
channels = [("Hospital Referral", 0.85, "40%"),
            ("Organic / SEO",     0.50, "25%"),
            ("Doctor Referral",   0.40, "20%"),
            ("Social / Creator",  0.30, "15%")]
for i, (lbl, pct, val) in enumerate(channels):
    progress_bar(s, Inches(9.1), Inches(2.72 + i * 0.5),
                 Inches(3.8), pct, lbl, val)

box(s, Inches(9.0), Inches(5.0), Inches(4.0), Inches(2.1),
    fill=NAVY2, border=BORDER, border_w=Pt(0.75))
txt(s, "Hospital Value Prop", Inches(9.15), Inches(5.12),
    Inches(3.7), Inches(0.28), size=12, bold=True, color=GREEN)
hvp = ["Saves doctors 8 min/patient pre-visit",
       "Reduces readmission with engagement",
       "Department-level analytics dashboard",
       "Co-branded subscription revenue share"]
for i, v in enumerate(hvp):
    txt(s, f"✓  {v}", Inches(9.15), Inches(5.52 + i * 0.38),
        Inches(3.7), Inches(0.34), size=11, color=LGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 11: FINANCIALS
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Financial Projections")
heading(s, "Conservative path to ₹10Cr ARR\nin 24 months.", size=30)
sub(s, "Bottom-up model: hospital B2B anchor + freemium consumer conversion at 2%.")

# bar chart
milestones = [("Q4'25","₹0",0), ("Q2'26","₹30L",0.03),
              ("Q4'26","₹1.2Cr",0.14), ("Q4'27","₹10Cr",1.0)]
chart_y = Inches(2.4)
chart_h = Inches(2.8)
chart_x = Inches(0.8)
chart_bar_w = Inches(1.4)
for i, (period, val, pct) in enumerate(milestones):
    bx = chart_x + Inches(i * 2.6)
    bh = chart_h * max(pct, 0.015)
    by = chart_y + chart_h - bh
    c = GREEN if pct == 1.0 else (CYAN if pct > 0.1 else BLUE)
    box(s, bx, by, chart_bar_w, bh, fill=c)
    txt(s, val, bx, by - Inches(0.35), chart_bar_w, Inches(0.32),
        size=12, bold=True, color=c, align=PP_ALIGN.CENTER)
    txt(s, period, bx, chart_y + chart_h + Inches(0.08), chart_bar_w, Inches(0.28),
        size=11, color=MGRAY, align=PP_ALIGN.CENTER)

# milestones right
box(s, Inches(7.0), Inches(2.2), Inches(6.0), Inches(4.6),
    fill=NAVY2, border=BORDER, border_w=Pt(0.75))
txt(s, "Revenue Milestones", Inches(7.15), Inches(2.32),
    Inches(5.7), Inches(0.28), size=13, bold=True, color=CYAN)
rows2 = [
    ("Year 1", "₹30L ARR",    "500 users · 3 hospitals", BLUE),
    ("Year 2", "₹1.2Cr ARR",  "10K users · 20 hospitals", CYAN),
    ("Year 3", "₹10Cr ARR",   "100K users · 100 hospitals", GREEN),
]
for i, (yr, rev, kpi, col) in enumerate(rows2):
    y = Inches(2.82 + i * 1.05)
    box(s, Inches(7.1), y, Inches(5.7), Inches(0.95),
        fill=RGBColor(0x0f, 0x1d, 0x38), border=col, border_w=Pt(0.75))
    txt(s, yr, Inches(7.25), y + Inches(0.08),
        Inches(1.2), Inches(0.28), size=11, color=DGRAY)
    txt(s, rev, Inches(7.25), y + Inches(0.38),
        Inches(2.5), Inches(0.42), size=20, bold=True, color=col)
    txt(s, kpi, Inches(9.8), y + Inches(0.3),
        Inches(2.8), Inches(0.3), size=11, color=MGRAY, align=PP_ALIGN.RIGHT)

txt(s, "Key Assumptions: 2% freemium→paid conversion · ₹75L/yr avg hospital contract · 60% gross margin at scale",
    Inches(7.1), Inches(6.1), Inches(5.7), Inches(0.5),
    size=10, color=DGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 12: THE ASK
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "The Ask")
heading(s, "Raising $1.5M Seed Round\nto capture the market window.", size=30)
sub(s, "12 months of focused execution to prove hospital-led B2B2C model and hit Series A metrics.")

asks = [
    ("👥", "Team (40%)",              "$600K",
     "Senior AI/ML engineer, backend lead,\nmobile engineer, medical advisor"),
    ("🤝", "Hospital Partnerships (20%)", "$300K",
     "Integration costs, medical advisory board,\nDPDP regulatory compliance"),
    ("📱", "Product & Mobile (20%)",   "$300K",
     "Native iOS/Android apps, offline mode,\nWhatsApp bot integration"),
    ("🚀", "GTM & Operations (20%)",   "$300K",
     "Sales, marketing, infrastructure,\nlegal, compliance, working capital"),
]
for i, (icon, title, amount, desc) in enumerate(asks):
    y = Inches(2.3 + i * 1.1)
    b = box(s, Inches(0.5), y, Inches(8.2), Inches(0.95),
            fill=NAVY2, border=BORDER, border_w=Pt(0.75))
    txt(s, icon, Inches(0.65), y + Inches(0.2), Inches(0.55), Inches(0.5), size=22)
    txt(s, title, Inches(1.3), y + Inches(0.1),
        Inches(5.5), Inches(0.3), size=13, bold=True, color=WHITE)
    txt(s, desc, Inches(1.3), y + Inches(0.48),
        Inches(5.5), Inches(0.42), size=11, color=MGRAY)
    txt(s, amount, Inches(6.8), y + Inches(0.2),
        Inches(1.7), Inches(0.5), size=22, bold=True, color=CYAN,
        align=PP_ALIGN.RIGHT)

# Series A target
box(s, Inches(8.9), Inches(2.25), Inches(4.0), Inches(5.15),
    fill=RGBColor(0x07, 0x12, 0x28), border=BLUE, border_w=Pt(1.2))
txt(s, "Series A Milestones", Inches(9.05), Inches(2.38),
    Inches(3.7), Inches(0.28), size=13, bold=True, color=CYAN)
milestones_a = [
    "₹1.2Cr ARR (10 hospital contracts)",
    "10,000 active premium consumers",
    "NPS > 65 from patients & doctors",
    "DPDP compliance certification",
    "iOS + Android apps launched",
    "Insurance company pilot signed",
]
for i, m in enumerate(milestones_a):
    txt(s, f"✓  {m}", Inches(9.05), Inches(2.82 + i * 0.48),
        Inches(3.7), Inches(0.42), size=11, color=LGRAY)

box(s, Inches(8.9), Inches(5.75), Inches(4.0), Inches(1.35),
    fill=RGBColor(0x07, 0x12, 0x28), border=CYAN, border_w=Pt(1))
txt(s, "Target Series A", Inches(9.05), Inches(5.88),
    Inches(3.7), Inches(0.25), size=11, color=MGRAY)
txt(s, "$8–12M", Inches(9.05), Inches(6.15),
    Inches(3.7), Inches(0.5), size=28, bold=True, color=CYAN)
txt(s, "At 8-10x ARR · 18 months away",
    Inches(9.05), Inches(6.65), Inches(3.7), Inches(0.25), size=10, color=DGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 13: TEAM
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "The Team")
heading(s, "Builders who understand healthcare\nfrom the inside.", size=30)
sub(s, "A rare combination of deep AI engineering, clinical domain knowledge, and enterprise GTM experience.")

team = [
    ("TG", "Tridib Goswami", "Founder & CEO", BLUE,
     "AI architect with 10+ years in enterprise software. "
     "Built HealthWeave MVP solo in 8 weeks using Claude AI. "
     "Deep expertise in RAG, vector DBs, and clinical data architecture."),
    ("—", "Open · CTO", "Hiring: ML / Backend Lead", CYAN,
     "Seeking: 5+ yrs ML engineering, FastAPI + vector DB experience, "
     "passion for healthcare AI. Competitive equity + salary. Funded role in seed round."),
    ("—", "Open · Advisor", "Hiring: Clinical Partner", PURPLE,
     "Seeking: MD/MBBS with digital health interest. Hospital dept head preferred. "
     "Advisory equity + patient engagement for pilot site. Clinical AI validation."),
]
for i, (initials, name, role, col, bio) in enumerate(team):
    x = Inches(0.5 + i * 4.2)
    b = box(s, x, Inches(2.25), Inches(4.0), Inches(3.4),
            fill=NAVY2, border=BORDER, border_w=Pt(0.75))
    # avatar circle (simulated with square)
    av = box(s, x + Inches(1.5), Inches(2.4), Inches(1.0), Inches(1.0),
             fill=col)
    txt(s, initials, x + Inches(1.5), Inches(2.4), Inches(1.0), Inches(1.0),
        size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    txt(s, name, x, Inches(3.52), Inches(4.0), Inches(0.3),
        size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    txt(s, role, x, Inches(3.85), Inches(4.0), Inches(0.25),
        size=11, color=col, align=PP_ALIGN.CENTER, bold=True)
    txt(s, bio, x + Inches(0.15), Inches(4.18), Inches(3.7), Inches(1.2),
        size=11, color=MGRAY)

# why we win
box(s, Inches(0.5), Inches(5.85), Inches(12.5), Inches(1.3),
    fill=RGBColor(0x07, 0x12, 0x28), border=BORDER, border_w=Pt(0.75))
txt(s, "Why We Win", Inches(0.65), Inches(5.97),
    Inches(3.0), Inches(0.28), size=13, bold=True, color=GREEN)
wins = ["First-principles AI — not prompt wrappers",
        "India-specific medical knowledge built in",
        "Hospital GTM from day one — not a pivot",
        "Full-stack: OCR → correlations → predictions"]
for i, w in enumerate(wins):
    txt(s, f"✓  {w}", Inches(0.65 + i * 3.05), Inches(6.32),
        Inches(2.9), Inches(0.55), size=11, color=LGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 14: REGULATORY & PRIVACY
# ════════════════════════════════════════════════════════════════
s = add_slide()
section_label(s, "Compliance & Trust")
heading(s, "Enterprise-grade privacy and\ncompliance from day one.", size=30)
sub(s, "Health data demands the highest standards. HealthWeave is architected to exceed them.")

compliance = [
    ("🇮🇳", "DPDP Act 2023", BLUE,
     ["Purpose-limited data collection", "User consent at every data point",
      "Right to erasure built into architecture", "Data localisation — India servers only"]),
    ("🔐", "Security Architecture", CYAN,
     ["AES-256 encryption at rest", "TLS 1.3 in transit",
      "JWT + refresh token rotation", "API rate limiting + abuse detection"]),
    ("🏥", "ABDM Ready", GREEN,
     ["ABHA ID integration planned Q3 2026", "FHIR R4 data model alignment",
      "Health Locker consent framework", "Interoperability with NDHM ecosystem"]),
    ("⚖️", "Medical Disclaimers", PURPLE,
     ["Every AI response includes disclaimer", "AI is supplementary — not diagnostic",
      "Doctor consultation always recommended", "Audit log on all AI-generated outputs"]),
]
for i, (icon, title, col, items) in enumerate(compliance):
    x = Inches(0.5 + i * 3.1)
    b = box(s, x, Inches(2.3), Inches(2.9), Inches(4.5),
            fill=NAVY2, border=col, border_w=Pt(1))
    txt(s, icon, x + Inches(0.15), Inches(2.42),
        Inches(0.55), Inches(0.5), size=26)
    txt(s, title, x + Inches(0.15), Inches(2.98),
        Inches(2.6), Inches(0.3), size=13, bold=True, color=col)
    for j, item in enumerate(items):
        txt(s, f"• {item}", x + Inches(0.15), Inches(3.38 + j * 0.68),
            Inches(2.6), Inches(0.6), size=11, color=LGRAY)

# ════════════════════════════════════════════════════════════════
# SLIDE 15: VISION / CTA
# ════════════════════════════════════════════════════════════════
s = add_slide()

# center glow
box(s, Inches(3), Inches(1), Inches(7.5), Inches(5.5),
    fill=RGBColor(0x00, 0x10, 0x30))

txt(s, "The Vision", Inches(0.5), Inches(0.6),
    Inches(12.5), Inches(0.3), size=11, bold=True, color=CYAN, align=PP_ALIGN.CENTER)

txt(s, "Every human on Earth deserves",
    Inches(0.5), Inches(1.1), Inches(12.5), Inches(0.65),
    size=40, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
txt(s, "a lifelong health companion that never forgets.",
    Inches(0.5), Inches(1.72), Inches(12.5), Inches(0.65),
    size=40, bold=True, color=CYAN, align=PP_ALIGN.CENTER)

txt(s, "In 2035, HealthWeave will prevent more chronic diseases than any hospital system in Asia —\n"
       "not by treating illness, but by making it predictable, and therefore preventable.",
    Inches(1.5), Inches(2.55), Inches(10.5), Inches(0.85),
    size=15, color=MGRAY, align=PP_ALIGN.CENTER)

# stat row
stats_v = [("1B+", "Lives to Impact by 2035"),
           ("$100B+", "Healthcare Spend to Prevent"),
           ("10M+", "Diseases Caught Early")]
for i, (n, l) in enumerate(stats_v):
    x = Inches(1.5 + i * 3.4)
    b = box(s, x, Inches(3.6), Inches(3.1), Inches(1.05),
            fill=NAVY2, border=BORDER, border_w=Pt(0.75))
    txt(s, n, x, Inches(3.65), Inches(3.1), Inches(0.5),
        size=26, bold=True, color=CYAN, align=PP_ALIGN.CENTER)
    txt(s, l, x, Inches(4.12), Inches(3.1), Inches(0.3),
        size=11, color=MGRAY, align=PP_ALIGN.CENTER)

# CTA box
b = box(s, Inches(3.2), Inches(4.9), Inches(7.0), Inches(1.65),
        fill=RGBColor(0x07, 0x12, 0x28), border=CYAN, border_w=Pt(1.5))
txt(s, "🧬  HealthWeave", Inches(3.4), Inches(5.05),
    Inches(4.0), Inches(0.38), size=18, bold=True, color=WHITE)
txt(s, "tridib.goswami@gmail.com", Inches(3.4), Inches(5.48),
    Inches(4.0), Inches(0.28), size=13, color=MGRAY)
txt(s, "$1.5M", Inches(8.2), Inches(5.05),
    Inches(1.8), Inches(0.45), size=28, bold=True, color=CYAN, align=PP_ALIGN.CENTER)
txt(s, "Seed Round Open", Inches(8.2), Inches(5.52),
    Inches(1.8), Inches(0.25), size=10, color=DGRAY, align=PP_ALIGN.CENTER)

txt(s, "Confidential · HealthWeave 2026 · For investor discussion only",
    Inches(0.5), Inches(7.1), Inches(12.5), Inches(0.25),
    size=10, color=DGRAY, align=PP_ALIGN.CENTER)

# ════════════════════════════════════════════════════════════════
# SAVE PPTX
# ════════════════════════════════════════════════════════════════
prs.save(PPTX_PATH)
print(f"✅  PPTX saved: {PPTX_PATH}")

# ════════════════════════════════════════════════════════════════
# EXPORT PDF via LibreOffice
# ════════════════════════════════════════════════════════════════
PDF_PATH = PPTX_PATH.replace(".pptx", ".pdf")
result = subprocess.run(
    ["libreoffice", "--headless", "--convert-to", "pdf",
     "--outdir", OUT_DIR, PPTX_PATH],
    capture_output=True, text=True, timeout=120
)
print(result.stdout)
if result.returncode == 0:
    print(f"✅  PDF saved: {PDF_PATH}")
else:
    print("❌  PDF export failed:")
    print(result.stderr)
