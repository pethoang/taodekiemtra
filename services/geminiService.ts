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

// Helper to convert File to Base64 string (for Images and PDFs)
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
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

// Helper to extract text from DOCX
const extractTextFromDocx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
           reject("Could not read file");
           return;
        }
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        resolve(result.value);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  let contentScopeInstruction = "";
  let userPrompt = "";
  let promptParts: any[] = [];
  let responseSchema;
  let questionTypeInstruction = "";

  if (sampleFile) {
    // UPLOAD MODE: Bỏ qua các tham số numQuestions, numOptions và questionType của UI
    contentScopeInstruction = `2. **Nguồn nội dung (Phân tích tài liệu)**: 
    - Phân tích nội dung file đính kèm (ảnh, PDF hoặc text từ Word).
    - Xác định trình độ (CEFR), cấu trúc ngữ pháp, từ vựng và độ khó.
    - **Nhiệm vụ**: Tạo một đề thi MỚI có độ khó và cấu trúc TƯƠNG ĐƯƠNG với mẫu.
    - **Cấu trúc**: Tự xác định số lượng câu hỏi và loại câu hỏi (Trắc nghiệm hoặc Điền từ) dựa trên mẫu. 
    - Không copy nguyên văn câu hỏi từ mẫu. Tạo các câu hỏi GỐC kiểm tra cùng kiến thức.`;

    userPrompt = `Hãy phân tích tài liệu đính kèm. Tạo một đề thi mới mô phỏng cấu trúc, độ dài, độ khó và phong cách của đề thi mẫu này. ${customPrompt ? `Yêu cầu bổ sung: ${customPrompt}` : ''}`;
    
    questionTypeInstruction = `**Định dạng câu hỏi**: Phân tích file mẫu để quyết định định dạng (Trắc nghiệm, Điền từ hoặc hỗn hợp).`;

    responseSchema = {
        type: Type.OBJECT,
        properties: {
          quiz: {
            type: Type.ARRAY,
            description: `Danh sách các câu hỏi được tạo dựa trên cấu trúc đề mẫu.`,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "Nội dung câu hỏi." },
                options: { 
                  type: Type.ARRAY, 
                  description: "Mảng các lựa chọn. Nếu là câu hỏi điền từ, để trống mảng này.",
                  items: { type: Type.STRING } 
                },
                answer: { type: Type.STRING, description: "Đáp án đúng." },
              },
              required: ["question", "options", "answer"],
            },
          },
        },
        required: ["quiz"],
    };

    const isDocx = sampleFile.name.toLowerCase().endsWith('.docx') || sampleFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isDocx) {
        try {
            const docText = await extractTextFromDocx(sampleFile);
            promptParts = [
                { text: `Nội dung văn bản từ file Word:\n\n${docText}` },
                { text: userPrompt }
            ];
        } catch (e) {
            console.error("Lỗi đọc file DOCX", e);
            throw new Error("Không thể đọc file Word. Vui lòng chuyển sang PDF hoặc Ảnh.");
        }
    } else {
        const filePart = await fileToGenerativePart(sampleFile);
        promptParts = [
            filePart,
            { text: userPrompt }
        ];
    }

  } else {
    // TEXTBOOK MODE: Sử dụng cấu hình từ UI
    const isMultipleChoice = questionType === 'multiple-choice';
    const baseSchemaProperties = {
        question: {
          type: Type.STRING,
          description: isMultipleChoice 
            ? "Nội dung câu hỏi." 
            : "Câu hỏi điền từ, chứa '____' tại vị trí cần điền.",
        },
        options: {
          type: Type.ARRAY,
          description: isMultipleChoice 
            ? `Mảng gồm đúng ${numOptions} đáp án.` 
            : "Mảng trống.",
          items: { type: Type.STRING },
        },
        answer: {
          type: Type.STRING,
          description: isMultipleChoice 
            ? "Đáp án đúng, phải khớp chính xác với một trong các options." 
            : "Từ/cụm từ đúng để điền vào chỗ trống.",
        },
      };

    if (unit.includes("End term 1")) {
      contentScopeInstruction = `2.  **Nguồn nội dung**: Ôn tập học kỳ 1 Sách "Global Success Grade ${grade}". Tập trung 70% vào Unit 4, 5, 6 và 30% vào Unit 1, 2, 3.`;
    } else if (unit.includes("End term 2")) {
      contentScopeInstruction = `2.  **Nguồn nội dung**: Ôn tập học kỳ 2 Sách "Global Success Grade ${grade}". Tập trung 70% vào Unit 10, 11, 12 và 30% vào Unit 7, 8, 9.`;
    } else {
      contentScopeInstruction = `2.  **Nguồn nội dung**: Nội dung phải bám sát Unit: "Global Success Grade ${grade}, ${unit}". Lấy từ các phần Getting started, A closer look, Looking back.`;
    }

    questionTypeInstruction = isMultipleChoice 
      ? `**Định dạng**: Đề thi trắc nghiệm hoàn toàn. Mỗi câu có đúng ${numOptions} lựa chọn.`
      : `**Định dạng**: Đề thi điền vào chỗ trống. Mỗi câu hỏi chứa '____'.`;

    userPrompt = `Tạo đề thi cho "Global Success ${grade} - ${unit}". ${customPrompt ? `Yêu cầu thêm: ${customPrompt}` : ''}`;
    promptParts = [{ text: userPrompt }];

    responseSchema = {
        type: Type.OBJECT,
        properties: {
          quiz: {
            type: Type.ARRAY,
            description: `Mảng gồm ${numQuestions} câu hỏi.`,
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

  const systemInstruction = `Bạn là một giáo viên tiếng Anh chuyên gia, chuyên soạn đề cho học sinh trung học (lớp 6-9).
Nhiệm vụ của bạn là tạo đề thi dựa trên yêu cầu người dùng.

YÊU CẦU BẮT BUỘC:
1.  **Ngôn ngữ**: Toàn bộ câu hỏi, đáp án phải bằng tiếng Anh.
${contentScopeInstruction}
4.  **Độ khó**: Phải phù hợp với khối lớp hoặc tệp mẫu đính kèm.
${questionTypeInstruction}
6.  **Ngữ cảnh**: Các câu hỏi phải có ngữ cảnh rõ ràng, gần gũi với lứa tuổi.
7.  **Định dạng đầu ra**: Phải trả về JSON hợp lệ theo schema đã cung cấp. Đối với trắc nghiệm, các lựa chọn nên bắt đầu bằng "A. ", "B. ", "C. ", "D. ".
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
        role: 'user',
        parts: promptParts
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.7,
    },
  });

  const jsonText = response.text.trim();
  try {
    return JSON.parse(jsonText) as QuizData;
  } catch (e) {
    console.error("Lỗi parse JSON:", jsonText);
    throw new Error("Hệ thống AI phản hồi không đúng định dạng. Vui lòng thử lại.");
  }
}