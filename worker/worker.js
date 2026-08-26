const MODEL = "gemini-3.7-flash";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

const schema = {
  type: "object",
  properties: {
    requested: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company:{type:"string"}, booth:{type:"string"}, relevance:{type:"integer",minimum:1,maximum:5},
          why:{type:"string"}, technologies:{type:"array",items:{type:"string"}},
          whatToSee:{type:"string"}, questions:{type:"string"}, latest:{type:"string"},
          sources:{type:"array",items:{type:"object",properties:{title:{type:"string"},url:{type:"string"}},required:["title","url"]}},
          kind:{type:"string"}
        },
        required:["company","booth","relevance","why","technologies","whatToSee","questions","latest","sources","kind"]
      }
    },
    discovered: {
      type:"array",
      items:{
        type:"object",
        properties:{
          company:{type:"string"},booth:{type:"string"},relevance:{type:"integer",minimum:1,maximum:5},
          why:{type:"string"},technologies:{type:"array",items:{type:"string"}},
          whatToSee:{type:"string"},questions:{type:"string"},latest:{type:"string"},
          sources:{type:"array",items:{type:"object",properties:{title:{type:"string"},url:{type:"string"}},required:["title","url"]}},
          kind:{type:"string"}
        },
        required:["company","booth","relevance","why","technologies","whatToSee","questions","latest","sources","kind"]
      }
    }
  },
  required:["requested","discovered"]
};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:cors})}

export default {
 async fetch(request,env){
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(request.method!=="POST") return json({error:"Method Not Allowed"},405);
  if(!env.GEMINI_API_KEY) return json({error:"GEMINI_API_KEY 尚未設定在 Cloudflare Worker Secret"},500);

  let body;
  try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
  const companies=Array.isArray(body.companies)?body.companies.slice(0,30):[];
  const keywords=Array.isArray(body.keywords)?body.keywords.slice(0,20):[];
  const candidates=Array.isArray(body.candidates)?body.candidates.slice(0,1400):[];

  const prompt=`你是 SEMICON Taiwan 產業與技術觀展分析師。
使用者想看的指定廠商：${JSON.stringify(companies)}
使用者關心的核心技術：${JSON.stringify(keywords)}
SEMICON 參展商完整清單（名稱＋攤位；這是本次展商名單的資料邊界）：${JSON.stringify(candidates)}

任務：
1. 對指定廠商逐家分析。若名稱不完整，請用網路搜尋確認正式公司名稱。
2. 針對使用者的技術興趣，從提供的完整參展商清單中找出最多 8 家「使用者沒有指定、但值得拜訪」的公司；不得自行創造清單外的參展商。
3. 必須使用 Google Search 查找最新公開資訊，優先官方網站、官方新聞稿、SEMICON Taiwan 官方資訊與近期可靠產業媒體。
4. 分析重點：公司定位、與使用者技術興趣的關聯、SEMICON 值得看的技術、最新動態、現場應該問什麼。
5. 不要把沒有證據的資訊寫成事實。若攤位無法由提供的資料或搜尋確認，booth 請留空字串。
6. sources 只放實際找到且可開啟的來源 URL。
7. relevance 是 1-5 的拜訪相關性，不是公司規模評分。
8. kind：指定廠商填 requested；AI 發現的廠商填 discovered。
9. 回覆必須符合指定 JSON schema，不要輸出 Markdown。`;

  const payload={
    model:MODEL,
    input:prompt,
    tools:[{type:"google_search"}],
    response_format:{type:"text",mime_type:"application/json",schema},
    generation_config:{max_output_tokens:12000}
  };

  let r;
  try{
    r=await fetch("https://generativelanguage.googleapis.com/v1beta/interactions",{
      method:"POST",
      headers:{"x-goog-api-key":env.GEMINI_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
  }catch(e){return json({error:"無法連線 Gemini API："+e.message},502)}

  const raw=await r.text();
  if(!r.ok)return json({error:"Gemini API 錯誤",detail:raw.slice(0,1500)},502);

  let result;
  try{result=JSON.parse(raw)}catch{return json({error:"Gemini 回傳不是 JSON",detail:raw.slice(0,1500)},502)}
  let text=result.output_text;
  if(!text && Array.isArray(result.steps)){
    for(const step of result.steps){
      if(step.type==="model_output"&&Array.isArray(step.content)){
        const t=step.content.find(x=>x.type==="text");
        if(t?.text) text=t.text;
      }
    }
  }
  if(!text)return json({error:"Gemini 沒有回傳分析內容"},502);

  try{
    const data=JSON.parse(text);
    const grounded=[];
    for(const step of (result.steps||[])){
      for(const block of (step.content||[])){
        for(const ann of (block.annotations||[])){
          if(ann.type==="url_citation" && ann.url){
            grounded.push({title:ann.title||ann.url,url:ann.url});
          }
        }
      }
    }
    const uniqueGrounded=[...new Map(grounded.map(x=>[x.url,x])).values()].slice(0,20);
    data.requested=(data.requested||[]).map(x=>({...x,kind:"requested",sources:(x.sources&&x.sources.length?x.sources:uniqueGrounded.slice(0,5))}));
    data.discovered=(data.discovered||[]).map(x=>({...x,kind:"discovered",sources:(x.sources&&x.sources.length?x.sources:uniqueGrounded.slice(0,5))}));
    return json(data);
  }catch(e){return json({error:"AI 結果無法解析為 JSON",detail:text.slice(0,1500)},502)}
 }
};
