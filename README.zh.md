# 面向金融NLP的LLM优化策略比较研究

本项目是一个毕业设计项目，针对GPT-5.4和EXAONE模型，在4个金融数据集上比较评估Zero-shot、Few-shot、RAG、QLoRA等多种策略。

---

## 项目结构

```
capstone-financial-nlp/
├── data/                        # 数据集 (unified JSONL格式)
│   ├── fpb.unified.jsonl
│   ├── fiqa_sa.unified.jsonl
│   ├── finqa.unified.jsonl
│   └── financial_mmlu_ko.unified.jsonl
├── docs/                        # RAG源文档
│   ├── Financial News20/        # 英文金融新闻20篇
│   └── Financialreports/        # 财务报告10篇
├── experiments/                 # 实验框架 (Python)
│   ├── config.py                # 模型/数据集/实验组配置
│   ├── data_loader.py           # 数据加载与预处理
│   ├── prompts.py               # 各策略提示词模板
│   ├── runner.py                # 实验执行 (API调用, 结果保存)
│   ├── evaluator.py             # 评估指标计算
│   └── outputs/                 # 实验结果自动保存位置
├── backend/                     # FastAPI服务器
│   ├── app/
│   │   ├── api/main.py          # API接口
│   │   ├── models/database.py   # SQLite数据库模型
│   │   └── services/
│   │       └── vector_store.py  # RAG (FAISS向量存储)
│   ├── build_index.py           # FAISS索引构建脚本
│   ├── faiss_index/             # 构建好的FAISS索引存储位置
│   └── results.db               # SQLite数据库 (自动生成)
├── frontend/                    # Next.js仪表板
│   └── app/
│       ├── dashboard/page.tsx   # 实验结果可视化
│       ├── admin/page.tsx       # 结果表格查询
│       └── lib/api.ts           # 后端API对接
├── .env                         # API密钥 (不纳入git)
├── requirements.txt             # Python包列表
└── README.zh.md
```

---

## 实验组配置 (6组 × 4数据集 = 24个实验)

| 组 | 模型 | 策略 | RAG | 微调 | 负责人 |
|---|---|---|---|---|---|
| A | GPT-5.4 | Zero-shot | X | X | 张俊为 |
| B | GPT-5.4 | Few-shot (3-shot) | X | X | 张俊为 |
| C | GPT-5.4 | 优化提示词 + RAG | O | X | 张俊为 |
| D | EXAONE 4.0 32B | Zero-shot | X | X | 吴正彬 |
| E | EXAONE 4.0 32B | 优化提示词 + RAG | O | X | 吴正彬 |
| F | EXAONE Deep 7.8B | QLoRA + RAG | O | O | 吴正彬 |

---

## 数据集 (4个)

| 数据集 | 任务 | 语言 | 规模 |
|---|---|---|---|
| FPB (Financial PhraseBank) | 情感三分类 | EN | 5K条 |
| FiQA-SA | 情感三分类 | EN | 1.2K条 |
| FinQA | 财务数值推理QA | EN | 1.1K条 (test split) |
| Financial MMLU-KO | 多选题 | KO | 455条 |

---

## 环境配置

### 1. 安装Python包

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量 (.env)

在项目根目录创建 `.env` 文件：

```
OPENAI_API_KEY=sk-...
EXAONE_API_KEY=...        # 向导师获取
EXAONE_API_BASE=...       # 向导师获取 (EXAONE API服务器地址)
```

### 3. 构建FAISS索引 (仅需一次)

```bash
cd capstone-financial-nlp
python backend/build_index.py
```

将 `docs/` 文件夹中的30个文档 → 切分为102个块 → 保存FAISS索引

---

## 运行实验

### 单个实验

```bash
cd experiments
python -c "from runner import run_experiment; run_experiment(group='A', dataset='fpb')"
```

### 全部实验 (24个批量运行)

```bash
cd experiments
python -c "from runner import run_all_experiments; run_all_experiments()"
```

### 测试运行 (仅5条数据)

```bash
cd experiments
python -c "from runner import run_experiment; run_experiment(group='A', dataset='fpb', dry_run=True, dry_run_n=5)"
```

### 评估 (生成metrics.json)

```bash
cd experiments
python evaluator.py A_fpb
```

---

## 完整流水线

```
1. 运行 runner.py
        ↓
   experiments/outputs/{组}_{数据集}/predictions.jsonl  (预测结果)

2. 运行 evaluator.py
        ↓
   experiments/outputs/{组}_{数据集}/metrics.json  (评估指标)

3. 启动FastAPI服务器后调用import接口
        ↓
   backend/results.db  (写入SQLite数据库)

4. 前端仪表板可视化展示
```

---

## 启动后端服务器

```bash
cd capstone-financial-nlp
python -m uvicorn backend.app.api.main:app --reload
```

服务器地址：`http://localhost:8000`
API文档：`http://localhost:8000/docs`

### API接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 服务器状态检查 |
| GET | `/api/v1/results` | 查询全部结果 (支持 `?group=A`, `?dataset=fpb` 过滤) |
| POST | `/api/v1/results` | 保存单条结果 |
| GET | `/api/v1/results/{group}/{dataset}` | 查询特定实验结果 |
| POST | `/api/v1/results/import` | 从 `experiments/outputs/` 批量导入数据库 |

---

## 启动前端

```bash
cd frontend
npm install
npm run dev
```

仪表板：`http://localhost:3000/dashboard`

---

## 评估指标

| 指标 | 适用数据集 | 说明 |
|---|---|---|
| Accuracy | FPB, FiQA-SA, MMLU-KO | 整体准确率 |
| F1 Macro/Micro/Weighted | FPB, FiQA-SA, MMLU-KO | F1分数 |
| Exact Match | FinQA | 与标准答案完全匹配的比例 |
| Numeric Close | FinQA | 误差在1%以内的比例 |
| LLM Judge | 全部 | 由GPT-5.4评分 (0~5分) |
| Avg Latency (ms) | 全部 | 平均响应时间 |
| Total Cost (USD) | 全部 | API费用合计 |

---

## 注意事项

- **EXAONE对接**：运行D/E/F组需要 `EXAONE_API_BASE` 环境变量（向导师获取）
- **测试数据**：数据库中存在测试用虚拟数据(id:1)和dry run结果(A_fpb 3条)，建议在正式实验前删除
- **RAG**：C/E/F组需要提前构建 `backend/faiss_index/`
- **费用控制**：FinQA数据量较大，仅使用test split(1,147条)以节省API费用 (config.py `default_split`)
