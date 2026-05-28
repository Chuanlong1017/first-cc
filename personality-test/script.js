const questions = [
  // E/I 维度 (0-4)
  { text: "在社交聚会中，我通常感到精力充沛，而不是疲惫。", dimension: "EI", positive: "E" },
  { text: "我喜欢通过与人交流来理清思路。", dimension: "EI", positive: "E" },
  { text: "在团队中工作比独自工作更让我感到舒适。", dimension: "EI", positive: "E" },
  { text: "结识新朋友对我来说很容易。", dimension: "EI", positive: "E" },
  { text: "我倾向于先行动，再思考。", dimension: "EI", positive: "E" },
  // S/N 维度 (5-9)
  { text: "我更关注具体的事实和细节，而非抽象的概念。", dimension: "SN", positive: "S" },
  { text: "我倾向于相信过去的经验，而非未来的可能性。", dimension: "SN", positive: "S" },
  { text: "我更喜欢务实、脚踏实地的方法。", dimension: "SN", positive: "S" },
  { text: "我常常注意到环境中的细微变化。", dimension: "SN", positive: "S" },
  { text: "我更喜欢按常规方式做事，而非尝试新方法。", dimension: "SN", positive: "S" },
  // T/F 维度 (10-14)
  { text: "我做决定时更看重逻辑和客观分析。", dimension: "TF", positive: "T" },
  { text: "我认为公平比和谐更重要。", dimension: "TF", positive: "T" },
  { text: "我倾向于直接指出问题，即使会伤害他人感情。", dimension: "TF", positive: "T" },
  { text: "我更信任理性的论证，而非个人感受。", dimension: "TF", positive: "T" },
  { text: "在冲突中，我更关注谁对谁错，而非大家的感受。", dimension: "TF", positive: "T" },
  // J/P 维度 (15-19)
  { text: "我喜欢提前制定计划并严格执行。", dimension: "JP", positive: "J" },
  { text: "我倾向于在截止日期前很久就完成任务。", dimension: "JP", positive: "J" },
  { text: "我认为规则和结构有助于提高效率。", dimension: "JP", positive: "J" },
  { text: "我更喜欢有明确目标的活动。", dimension: "JP", positive: "J" },
  { text: "我很难适应突发的变化。", dimension: "JP", positive: "J" }
];

const optionLabels = [
  { value: -2, label: "非常不同意" },
  { value: -1, label: "不同意" },
  { value: 0, label: "中立" },
  { value: 1, label: "同意" },
  { value: 2, label: "非常同意" }
];

const typeData = {
  ISTJ: { nickname: "检查员", desc: "务实可靠、注重细节、责任心强。你重视传统和秩序，是团队中值得信赖的基石。", careers: "会计师、审计师、项目经理、军官、法律助理", relations: "在感情中忠诚专一，表达方式较为含蓄，更看重行动而非言语。" },
  ISFJ: { nickname: "守护者", desc: "温和体贴、乐于助人、有强烈的责任感。你默默付出，总是把别人的需求放在第一位。", careers: "护士、社工、教师、行政助理、客户服务", relations: "温柔体贴的伴侣，善于照顾他人，但需要学会表达自己的需求。" },
  INFJ: { nickname: "提倡者", desc: "富有洞察力、理想主义、追求意义。你能深刻理解他人，并致力于让世界变得更美好。", careers: "心理咨询师、作家、教育工作者、非营利组织工作者", relations: "追求深层次的情感连接，重视精神共鸣，对伴侣非常忠诚。" },
  INTJ: { nickname: "建筑师", desc: "独立理性、战略思维、追求完美。你善于规划长远目标，并以高效的方式实现它们。", careers: "软件工程师、科学家、投资分析师、战略顾问、建筑师", relations: "理性冷静，重视智力上的匹配，一旦认定便会全心全意。" },
  ISTP: { nickname: "鉴赏家", desc: "冷静务实、善于分析、动手能力强。你喜欢探索事物的运作原理，是天生的问题解决者。", careers: "机械工程师、飞行员、法医、数据分析师、运动员", relations: "随性自由，不喜欢被束缚，更享受当下的相处。" },
  ISFP: { nickname: "探险家", desc: "敏感细腻、富有艺术气质、追求自由。你活在当下，享受生活中的美好瞬间。", careers: "艺术家、设计师、音乐家、厨师、兽医", relations: "温柔浪漫，善于营造温馨氛围，但需要个人空间。" },
  INFP: { nickname: "调停者", desc: "理想主义、富有同情心、追求真实。你有丰富的内心世界，渴望找到人生的真正意义。", careers: "作家、心理咨询师、翻译、社会工作者、教育工作者", relations: "深情浪漫，渴望灵魂伴侣，对感情投入极深。" },
  INTP: { nickname: "逻辑学家", desc: "好奇心强、逻辑严密、喜欢理论探索。你享受思考的过程，对知识有无尽的渴求。", careers: "科学家、程序员、哲学家、数学家、系统架构师", relations: "理性独立，重视思想交流，有时显得疏离但内心忠诚。" },
  ESTP: { nickname: "企业家", desc: "精力充沛、务实果断、善于应变。你喜欢冒险和挑战，在危机中反而能发挥出色。", careers: "销售经理、创业者、急救人员、谈判专家、体育教练", relations: "热情直接，喜欢刺激和新鲜感，是充满活力的伴侣。" },
  ESFP: { nickname: "表演者", desc: "活泼外向、热爱社交、享受当下。你是人群中的焦点，总能带来欢乐和活力。", careers: "演员、主持人、公关专员、活动策划、旅游顾问", relations: "热情奔放，喜欢表达爱意，需要伴侣能跟上你的节奏。" },
  ENFP: { nickname: "竞选者", desc: "充满热情、富有创意、善于激励他人。你总能看到可能性，并用正能量感染身边的人。", careers: "创业者、记者、咨询师、教师、市场营销", relations: "浪漫多情，渴望精神上的契合，需要伴侣理解你的多变。" },
  ENTP: { nickname: "辩论家", desc: "机智灵活、喜欢辩论、思维敏捷。你享受智力上的交锋，总能从不同角度看待问题。", careers: "律师、创业者、战略顾问、发明家、记者", relations: "风趣幽默，喜欢智力游戏，需要能跟上你思维的伴侣。" },
  ESTJ: { nickname: "总经理", desc: "高效务实、善于组织、重视传统。你天生具有领导才能，能将混乱变得井然有序。", careers: "高管、法官、军官、项目经理、政府官员", relations: "传统稳重，重视承诺和家庭责任，是可靠的伴侣。" },
  ESFJ: { nickname: "执政官", desc: "热心助人、善于协调、重视和谐。你是社交场合的灵魂人物，总能照顾到每个人的感受。", careers: "人力资源、护士、教师、客户服务、社区管理者", relations: "温柔体贴，重视家庭，渴望被需要和认可。" },
  ENFJ: { nickname: "主人公", desc: "富有魅力、善于领导、关心他人成长。你能激发他人的潜能，是天生的导师和领袖。", careers: "培训师、咨询师、政治家、人力资源总监、教师", relations: "深情专一，渴望与伴侣共同成长，非常重视沟通。" },
  ENTJ: { nickname: "指挥官", desc: "果断自信、战略眼光、天生的领导者。你善于制定目标并带领团队高效执行。", careers: "CEO、投资家、律师、管理顾问、企业家", relations: "直接坦诚，重视伴侣的独立性和成长，追求强强联合。" }
};

let currentQuestion = 0;
let answers = new Array(questions.length).fill(null);

const welcomePage = document.getElementById('welcome-page');
const quizPage = document.getElementById('quiz-page');
const resultPage = document.getElementById('result-page');

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
}

function loadProgress() {
  const saved = localStorage.getItem('mbti_progress');
  if (saved) {
    const data = JSON.parse(saved);
    if (data.answers && data.answers.length === questions.length) {
      answers = data.answers;
      currentQuestion = data.currentQuestion || 0;
      if (answers.every(a => a !== null)) {
        showResult();
        return;
      }
      showPage(quizPage);
      renderQuestion();
      return;
    }
  }
  showHistory();
}

function saveProgress() {
  localStorage.setItem('mbti_progress', JSON.stringify({ answers, currentQuestion }));
}

function showHistory() {
  const container = document.getElementById('history-stats');
  const history = JSON.parse(localStorage.getItem('mbti_history') || '[]');
  if (history.length > 0) {
    const last = history[history.length - 1];
    container.innerHTML = `<p>上次测试结果：${last.type} — ${typeData[last.type]?.nickname || ''}（${last.date}）</p>`;
  }
}

function renderQuestion() {
  if (currentQuestion >= questions.length) return;
  const q = questions[currentQuestion];
  document.getElementById('current-num').textContent = currentQuestion + 1;
  document.getElementById('total-num').textContent = questions.length;
  document.getElementById('question-text').textContent = q.text;

  const progress = ((currentQuestion) / questions.length) * 100;
  document.getElementById('progress-fill').style.width = progress + '%';

  const optionsContainer = document.getElementById('options');
  optionsContainer.innerHTML = '';

  optionLabels.forEach((opt, idx) => {
    const div = document.createElement('div');
    div.className = 'option' + (answers[currentQuestion] === opt.value ? ' selected' : '');
    div.innerHTML = `<div class="option-dot"></div><span>${opt.label}</span>`;
    div.addEventListener('click', () => selectOption(opt.value));
    optionsContainer.appendChild(div);
  });

  document.getElementById('prev-btn').disabled = currentQuestion === 0;
  document.getElementById('next-btn').textContent =
    currentQuestion === questions.length - 1 ? '查看结果' : '下一题';
  document.getElementById('next-btn').disabled = answers[currentQuestion] === null;
}

function selectOption(value) {
  if (currentQuestion >= questions.length || answers[currentQuestion] !== null) return;
  answers[currentQuestion] = value;
  saveProgress();
  renderQuestion();

  if (currentQuestion < questions.length - 1) {
    setTimeout(() => {
      currentQuestion++;
      renderQuestion();
    }, 250);
  }
}

function calculateResult() {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  questions.forEach((q, i) => {
    const answer = answers[i];
    const val = answer;
    if (q.dimension === 'EI') {
      if (val > 0) scores.E += val;
      else if (val < 0) scores.I += Math.abs(val);
    } else if (q.dimension === 'SN') {
      if (val > 0) scores.S += val;
      else if (val < 0) scores.N += Math.abs(val);
    } else if (q.dimension === 'TF') {
      if (val > 0) scores.T += val;
      else if (val < 0) scores.F += Math.abs(val);
    } else if (q.dimension === 'JP') {
      if (val > 0) scores.J += val;
      else if (val < 0) scores.P += Math.abs(val);
    }
  });

  const type =
    (scores.E >= scores.I ? 'E' : 'I') +
    (scores.S >= scores.N ? 'S' : 'N') +
    (scores.T >= scores.F ? 'T' : 'F') +
    (scores.J >= scores.P ? 'J' : 'P');

  const dimensions = [
    { label: '外向 E', opposite: '内向 I', left: scores.E, right: scores.I, leftKey: 'E', rightKey: 'I' },
    { label: '实感 S', opposite: '直觉 N', left: scores.S, right: scores.N, leftKey: 'S', rightKey: 'N' },
    { label: '思考 T', opposite: '情感 F', left: scores.T, right: scores.F, leftKey: 'T', rightKey: 'F' },
    { label: '判断 J', opposite: '知觉 P', left: scores.J, right: scores.P, leftKey: 'J', rightKey: 'P' }
  ];

  return { type, scores, dimensions };
}

function showResult() {
  const result = calculateResult();
  const data = typeData[result.type];

  document.getElementById('type-badge').textContent = result.type;
  document.getElementById('type-name').textContent = result.type;
  document.getElementById('type-nickname').textContent = data.nickname;
  document.getElementById('type-desc').textContent = data.desc;
  document.getElementById('type-careers').textContent = data.careers;
  document.getElementById('type-relations').textContent = data.relations;

  const dimContainer = document.getElementById('dimensions');
  dimContainer.innerHTML = '';

  result.dimensions.forEach((dim, i) => {
    const total = dim.left + dim.right;
    const leftPct = total > 0 ? (dim.left / total) * 100 : 50;
    const rightPct = total > 0 ? (dim.right / total) * 100 : 50;
    const winner = dim.left >= dim.right ? dim.leftKey : dim.rightKey;
    const winnerPct = Math.round(Math.max(leftPct, rightPct));

    const div = document.createElement('div');
    div.className = 'dimension';
    div.style.animationDelay = (i * 0.15) + 's';
    div.innerHTML = `
      <div class="dimension-labels">
        <span class="left">${dim.label} ${winner === dim.leftKey ? winnerPct + '%' : ''}</span>
        <span class="right">${dim.opposite} ${winner === dim.rightKey ? winnerPct + '%' : ''}</span>
      </div>
      <div class="dimension-bar">
        <div class="dimension-fill left-fill" style="width: ${leftPct / 2}%;"></div>
        <div class="dimension-fill right-fill" style="width: ${rightPct / 2}%;"></div>
      </div>
      <div class="dimension-value">${winner === dim.leftKey ? dim.label : dim.opposite} 倾向 ${winnerPct}%</div>
    `;
    dimContainer.appendChild(div);
  });

  const history = JSON.parse(localStorage.getItem('mbti_history') || '[]');
  history.push({ type: result.type, date: new Date().toLocaleDateString('zh-CN') });
  if (history.length > 3) history.shift();
  localStorage.setItem('mbti_history', JSON.stringify(history));
  localStorage.removeItem('mbti_progress');

  showPage(resultPage);
}

function resetQuiz() {
  currentQuestion = 0;
  answers = new Array(questions.length).fill(null);
  localStorage.removeItem('mbti_progress');
  showPage(welcomePage);
  showHistory();
}

document.getElementById('start-btn').addEventListener('click', () => {
  currentQuestion = 0;
  answers = new Array(questions.length).fill(null);
  saveProgress();
  showPage(quizPage);
  renderQuestion();
});

document.getElementById('prev-btn').addEventListener('click', () => {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
});

document.getElementById('next-btn').addEventListener('click', () => {
  if (answers[currentQuestion] === null) return;
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  } else {
    showResult();
  }
});

document.getElementById('restart-btn').addEventListener('click', resetQuiz);

document.getElementById('share-btn').addEventListener('click', () => {
  const result = calculateResult();
  const data = typeData[result.type];
  const text = `我的 MBTI 人格类型是 ${result.type}（${data.nickname}）！快来测测你的吧。`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('share-btn');
    const original = btn.textContent;
    btn.textContent = '已复制';
    setTimeout(() => btn.textContent = original, 1500);
  }).catch(() => alert('复制失败，请手动复制结果。'));
});

loadProgress();
