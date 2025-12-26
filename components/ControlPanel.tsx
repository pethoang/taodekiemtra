import React, { useMemo } from 'react';
import { TEXTBOOK_DATA } from '../constants';
import { Grade, QuestionType, GenerationMode } from '../types';

interface ControlPanelProps {
  selectedGrade: Grade;
  setSelectedGrade: (grade: Grade) => void;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  numQuestions: number;
  setNumQuestions: (num: number) => void;
  numOptions: number;
  setNumOptions: (num: number) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  selectedQuestionType: QuestionType;
  setSelectedQuestionType: (type: QuestionType) => void;
  onGenerate: () => void;
  isLoading: boolean;
  
  // New props for Upload Mode
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  sampleFile: File | null;
  setSampleFile: (file: File | null) => void;
}

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 3L9.25 8.75L3.5 9.5L7.88 13.38L6.5 19L12 16L17.5 19L16.12 13.38L20.5 9.5L14.75 8.75L12 3Z" />
    <path d="M5 3L6 5" />
    <path d="M19 3L18 5" />
    <path d="M12 21L12 19" />
  </svg>
);

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const FileIcon: React.FC<{ type: string } & React.SVGProps<SVGSVGElement>> = ({ type, ...props }) => {
  if (type.includes('image')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    );
  } else if (type.includes('pdf')) {
     return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
     )
  } else {
     return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
     )
  }
}


const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedGrade,
  setSelectedGrade,
  selectedUnit,
  setSelectedUnit,
  numQuestions,
  setNumQuestions,
  numOptions,
  setNumOptions,
  customPrompt,
  setCustomPrompt,
  selectedQuestionType,
  setSelectedQuestionType,
  onGenerate,
  isLoading,
  generationMode,
  setGenerationMode,
  sampleFile,
  setSampleFile,
}) => {
  const availableUnits = useMemo(() => {
    return TEXTBOOK_DATA.find((g) => g.grade === selectedGrade)?.units || [];
  }, [selectedGrade]);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGrade = e.target.value as Grade;
    setSelectedGrade(newGrade);
    const newUnits = TEXTBOOK_DATA.find((g) => g.grade === newGrade)?.units;
    if (newUnits && newUnits.length > 0) {
      setSelectedUnit(newUnits[0].id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSampleFile(e.target.files[0]);
    }
  };

  const commonInputClass = "mt-2 block w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 sm:text-sm sm:leading-6 transition-colors"

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg shadow-slate-200/80">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Bảng điều khiển</h2>

      {/* Mode Toggle Tabs */}
      <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-8">
        <button
          onClick={() => setGenerationMode('textbook')}
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            generationMode === 'textbook'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Chọn theo SGK
        </button>
        <button
          onClick={() => setGenerationMode('upload')}
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            generationMode === 'upload'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Từ đề mẫu
        </button>
      </div>

      <div className="grid grid-cols-1 gap-y-6">
        
        {generationMode === 'textbook' ? (
          <>
            <div>
              <label htmlFor="grade-select" className="block text-sm font-medium leading-6 text-slate-700">
                Sách giáo khoa
              </label>
              <select
                id="grade-select"
                value={selectedGrade}
                onChange={handleGradeChange}
                className={commonInputClass}
              >
                {TEXTBOOK_DATA.map((grade) => (
                  <option key={grade.grade} value={grade.grade}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="unit-select" className="block text-sm font-medium leading-6 text-slate-700">
                Unit
              </label>
              <select
                id="unit-select"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className={commonInputClass}
              >
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
                <label htmlFor="question-type-select" className="block text-sm font-medium leading-6 text-slate-700">
                    Loại câu hỏi (Đầu ra)
                </label>
                <select
                    id="question-type-select"
                    value={selectedQuestionType}
                    onChange={(e) => setSelectedQuestionType(e.target.value as QuestionType)}
                    className={commonInputClass}
                >
                    <option value="multiple-choice">Trắc nghiệm</option>
                    <option value="fill-in-the-blank">Điền vào chỗ trống</option>
                </select>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4">
              <div>
                <label htmlFor="num-questions" className="block text-sm font-medium leading-6 text-slate-700">
                  Số câu hỏi
                </label>
                <input
                  type="number"
                  id="num-questions"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10)))}
                  min="1"
                  max="50"
                  className={commonInputClass}
                />
              </div>
              {selectedQuestionType === 'multiple-choice' && (
                <div>
                  <label htmlFor="num-options" className="block text-sm font-medium leading-6 text-slate-700">
                    Số lượng đáp án
                  </label>
                  <select
                    id="num-options"
                    value={numOptions}
                    onChange={(e) => setNumOptions(parseInt(e.target.value, 10))}
                    className={commonInputClass}
                  >
                    <option value="3">3 đáp án</option>
                    <option value="4">4 đáp án</option>
                  </select>
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-700 mb-2">
              Upload đề mẫu (Ảnh, PDF, Word)
            </label>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors ${sampleFile ? 'border-sky-500 bg-sky-50' : 'border-slate-300'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                  {sampleFile ? (
                    <>
                      <FileIcon type={sampleFile.type} className="w-8 h-8 mb-2 text-sky-500" />
                      <p className="mb-1 text-sm text-slate-700 font-semibold truncate max-w-[200px]">{sampleFile.name}</p>
                      <p className="text-xs text-slate-500">Nhấn để thay đổi</p>
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-8 h-8 mb-2 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Nhấn để tải lên</span></p>
                      <p className="text-xs text-slate-400">JPG, PNG, PDF, DOCX (Max 10MB)</p>
                    </>
                  )}
                </div>
                <input 
                    id="dropzone-file" 
                    type="file" 
                    className="hidden" 
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                    onChange={handleFileChange} 
                />
              </label>
            </div>
             <p className="mt-2 text-xs text-slate-500 italic text-center">
                AI sẽ tự động phân tích định dạng và số lượng câu hỏi từ file của bạn.
             </p>
          </div>
        )}
      
        <div>
          <label htmlFor="custom-prompt" className="block text-sm font-medium leading-6 text-slate-700">
            Yêu cầu thêm (tùy chọn)
          </label>
          <textarea
            id="custom-prompt"
            rows={2}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ví dụ: Chỉ tập trung vào thì hiện tại đơn..."
            className={commonInputClass}
          />
        </div>
      </div>


      <div className="mt-8 text-center">
        <button
          onClick={onGenerate}
          disabled={isLoading || (generationMode === 'upload' && !sampleFile)}
          className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg shadow-sky-500/20 text-white bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 w-full"
        >
          <SparklesIcon className={`mr-2 h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Đang tạo đề...' : 'Tạo Đề Nhanh'}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;