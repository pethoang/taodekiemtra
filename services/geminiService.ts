
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, QuestionType } from '../types';
import mammoth from 'mammoth';

interface GenerateQuizParams {
  grade: string;
  unit: string;
  numQuestions: number;
  numOptions: number;
  customPrompt: string;
  questionType: QuestionType;
  sampleFile?: File | null;
}

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error("Không thể đọc tệp tin."));
        return;
      }
      const base64String = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const extractTextFromDocx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
           reject(new Error("Không thể đọc nội dung file Word."));
           return;
        }
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        resolve(result.value);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Lỗi khi đọc file Word."));
    reader.readAsArrayBuffer(file);
  });
};

export async function generateQuiz({
  grade,
  unit,
  numQuestions,
  numOptions,
  customPrompt,
  questionType,
  sampleFile,
}: GenerateQuizParams): Promise<QuizData> {
  // Always get the latest API key from process.env
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
    throw new Error("API Key chưa được thiết lập. Vui lòng nhấn nút 'Cấu hình API Key' để bắt đầu.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let contentScopeInstruction = "";
  let userPrompt = "";
  let promptParts: any[] = [];
  let responseSchema;
  let questionTypeInstruction = "";

  if (sampleFile) {
    contentScopeInstruction = `2. **Nguồn nội dung (Phân tích tài liệu)**: 
    - Phân tích nội dung file đính kèm để xác định trình độ, cấu trúc ngữ pháp và từ vựng.
    - **Nhiệm vụ**: Tạo một đề thi MỚI hoàn toàn nhưng có cấu trúc và phong cách TƯƠNG ĐƯƠNG với mẫu.
    - **Tự động hóa**: Bạn tự quyết định số lượng câu hỏi và kiểu câu hỏi (Trắc nghiệm/Điền từ) dựa trên những gì thấy trong mẫu. 
    - Tuyệt đối không copy nguyên văn câu hỏi từ mẫu.`;

    userPrompt = `Hãy phân tích tài liệu đính kèm và tạo một đề thi mới mô phỏng cấu trúc của nó. ${customPrompt ? `Yêu cầu thêm: ${customPrompt}` : ''}`;
    questionTypeInstruction = `**Định dạng**: Phân tích file để quyết định loại câu hỏi phù hợp nhất.`;

    responseSchema = {
        type: Type.OBJECT,
        properties: {
          quiz: {
            type: Type.ARRAY,
            description: `Danh sách các câu hỏi mới được tạo.`,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "Nội dung câu hỏi." },
                options: { 
                  type: Type.ARRAY, 
                  description: "Mảng các lựa chọn. Nếu là câu hỏi điền từ, hãy để mảng trống [].",
                  items: { type: Type.STRING } 
                },
                answer: { type: Type.STRING, description: "Đáp án đúng (Nếu trắc nghiệm phải khớp với một option, nếu điền từ là nội dung từ cần điền)." },
              },
              required: ["question", "options", "answer"],
            },
          },
        },
        required: ["quiz"],
    };

    const isDocx = sampleFile.name.toLowerCase().endsWith('.docx') || sampleFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isDocx) {
        const docText = await extractTextFromDocx(sampleFile);
        promptParts = [{ text: `Văn bản Word:\n\n${docText}` }, { text: userPrompt }];
    } else {
        const filePart = await fileToGenerativePart(sampleFile);
        promptParts = [filePart, { text: userPrompt }];
    }
  } else {
    const isMultipleChoice = questionType === 'multiple-choice';
    const baseSchemaProperties = {
        question: { type: Type.STRING, description: isMultipleChoice ? "Nội dung câu hỏi." : "Câu hỏi điền từ với dấu '____'." },
        options: { type: Type.ARRAY, description: isMultipleChoice ? `Mảng gồm ${numOptions} đáp án.` : "Mảng trống.", items: { type: Type.STRING } },
        answer: { type: Type.STRING, description: "Đáp án đúng." },
    };

    contentScopeInstruction = unit.includes("End term") 
      ? `2. **Nguồn nội dung**: Ôn tập tổng hợp chương trình Global Success Grade ${grade}.`
      : `2. **Nguồn nội dung**: Bám sát Unit: "Global Success Grade ${grade}, ${unit}".`;

    questionTypeInstruction = isMultipleChoice ? `**Định dạng**: Trắc nghiệm ${numOptions} lựa chọn.` : `**Định dạng**: Điền vào chỗ trống.`;
    userPrompt = `Tạo đề thi ${numQuestions} câu cho "Global Success ${grade} - ${unit}". ${customPrompt ? `Yêu cầu thêm: ${customPrompt}` : ''}`;
    promptParts = [{ text: userPrompt }];

    responseSchema = {
        type: Type.OBJECT,
        properties: {
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: baseSchemaProperties,
              required: ["question", "options", "answer"],
            },
          },
        },
        required: ["quiz"],
    };
  }

  const systemInstruction = `Bạn là chuyên gia soạn đề Tiếng Anh lớp 6-9.
YÊU CẦU:
1. Ngôn ngữ: Toàn bộ câu hỏi/đáp án bằng tiếng Anh.
${contentScopeInstruction}
3. Trình độ: Phù hợp khối lớp hoặc mẫu đính kèm.
${questionTypeInstruction}
4. Định dạng: Trả về JSON theo đúng schema. Đối với trắc nghiệm, các options phải bắt đầu bằng "A. ", "B. ", "C. ", "D. ".
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: promptParts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text || "";
    const cleanJsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    
    if (!cleanJsonText) {
       throw new Error("AI không trả về dữ liệu. Có thể do tệp tin không hợp lệ hoặc bị chặn bởi bộ lọc an toàn.");
    }

    return JSON.parse(cleanJsonText) as QuizData;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const errorMsg = error.message || "";
    
    if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("404")) {
       throw new Error("API Key hiện tại không tồn tại hoặc đã bị xóa. Vui lòng cấu hình lại API Key mới.");
    }
    if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("not valid")) {
       throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại mã khóa trên Google AI Studio.");
    }
    if (errorMsg.includes("safety") || errorMsg.includes("blocked")) {
       throw new Error("Yêu cầu bị từ chối bởi bộ lọc an toàn. Vui lòng thử nội dung khác hoặc ảnh rõ ràng hơn.");
    }
    if (errorMsg.includes("429")) {
       throw new Error("Tốc độ yêu cầu quá nhanh. Vui lòng đợi vài giây rồi thử lại.");
    }

    throw new Error(errorMsg || "Lỗi kết nối với trí tuệ nhân tạo.");
  }
}
