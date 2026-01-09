
import React, { useState, useCallback, useEffect } from 'react';
import { TEXTBOOK_DATA } from './constants';
import { Grade, QuizData, SavedQuiz, QuestionType, GenerationMode } from './types';
import { generateQuiz } from './services/geminiService';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import QuizDisplay from './components/QuizDisplay';
import Loader from './components/Loader';

// Removed local declare global for aistudio to avoid conflicts with pre-configured types

const App: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<Grade>('6');
  const [selectedUnit, setSelectedUnit] = useState<string>(TEXTBOOK_DATA[0].units[0].id);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [numOptions, setNumOptions] = useState<number>(4);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('multiple-choice');
  
  const [generationMode, setGenerationMode] = useState<GenerationMode>('textbook');
  const [sampleFile, setSampleFile] = useState<File | null>(null);

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isKeyError, setIsKeyError] = useState<boolean>(false);
  const [isFromStorage, setIsFromStorage] = useState<boolean>(false);
  const [savedContext, setSavedContext] = useState<{ gradeName: string; unitName: string} | null>(null);
  
  // Track if API key has been selected as per guidelines
  const [hasSelectedKey, setHasSelectedKey] = useState<boolean>(true);

  useEffect(() => {
    // Check if API key has been selected on mount as per mandatory guidelines
    const checkApiKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasSelectedKey(hasKey);
      }
    };
    checkApiKey();

    try {
      const savedQuizJSON = localStorage.getItem('savedQuiz');
      if (savedQuizJSON) {
        const savedQuiz: SavedQuiz = JSON.parse(savedQuizJSON);
        setQuizData(savedQuiz.quizData);
        setSavedContext({ gradeName: savedQuiz.gradeName, unitName: savedQuiz.unitName });
        setIsFromStorage(true);
      }
    } catch (e) {
      console.error("Failed to load or parse saved quiz from Local Storage.", e);
      localStorage.removeItem('savedQuiz');
    }
  }, []);

  const handleOpenKeyConfig = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        // Assume key selection was successful to avoid race condition as per guidelines
        setHasSelectedKey(true);
        setError(null);
        setIsKeyError(false);
      } else {
        window.open('https://ai.google.dev/gemini-api/docs/billing', '_blank');
      }
    } catch (e) {
      console.error("Error opening key config:", e);
    }
  };

  const handleGenerateQuiz = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsKeyError(false);
    setQuizData(null);
    setIsFromStorage(false);
    setSavedContext(null);

    let gradeInfo;
    let unitInfo;
    let contextGradeName = "";
    let contextUnitName = "";

    if (generationMode === 'textbook') {
        gradeInfo = TEXTBOOK_DATA.find(g => g.grade === selectedGrade);
        unitInfo = gradeInfo?.units.find(u => u.id === selectedUnit);

        if (!gradeInfo || !unitInfo) {
            setError("Vui lòng chọn Sách giáo khoa và Unit hợp lệ.");
            setIsLoading(false);
            return;
        }
        contextGradeName = gradeInfo.name;
        contextUnitName = unitInfo.name;
    } else {
        if (!sampleFile) {
            setError("Vui lòng tải lên file đề mẫu.");
            setIsLoading(false);
            return;
        }
        contextGradeName = "Đề mẫu";
        contextUnitName = sampleFile.name;
    }

    try {
      const result = await generateQuiz({
        grade: selectedGrade,
        unit: generationMode === 'textbook' ? (unitInfo?.name || '') : '',
        numQuestions,
        numOptions,
        customPrompt,
        questionType: selectedQuestionType,
        sampleFile: generationMode === 'upload' ? sampleFile : undefined,
      });
      
      setQuizData(result);
      const dataToSave: SavedQuiz = {
        quizData: result,
        gradeName: contextGradeName,
        unitName: contextUnitName,
      };
      localStorage.setItem('savedQuiz', JSON.stringify(dataToSave));
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "";
      setError(msg || "Đã có lỗi xảy ra. Vui lòng thử lại sau.");
      
      // Handle key-related errors as per guidelines
      if (msg.includes("API Key") || msg.includes("key not valid") || msg.includes("Requested entity was not found") || msg.includes("404")) {
        setIsKeyError(true);
        // If entity not found, force re-selection as per guidelines
        if (msg.includes("Requested entity was not found") || msg.includes("404")) {
          setHasSelectedKey(false);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedGrade, selectedUnit, numQuestions, numOptions, customPrompt, selectedQuestionType, generationMode, sampleFile]);

  const handleClearQuiz = () => {
    setQuizData(null);
    setIsFromStorage(false);
    setSavedContext(null);
    localStorage.removeItem('savedQuiz');
  };

  // Mandatory setup screen if no API key is selected
  if (!hasSelectedKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="bg-sky-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Cấu hình API Key</h2>
          <p className="text-slate-600 mb-8">
            Để sử dụng ứng dụng này, bạn cần chọn một API Key từ một dự án Google Cloud có trả phí (Paid Project).
          </p>
          <button
            onClick={handleOpenKeyConfig}
            className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-colors shadow-lg shadow-sky-200 mb-4"
          >
            Chọn API Key
          </button>
          <p className="text-xs text-slate-400">
            Xem <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">tài liệu về billing</a> để biết thêm chi tiết.
          </p>
        </div>
      </div>
    );
  }

  const currentGradeInfo = TEXTBOOK_DATA.find(g => g.grade === selectedGrade);
  const currentUnitInfo = currentGradeInfo?.units.find(u => u.id === selectedUnit);

  const displayGradeName = savedContext?.gradeName || (generationMode === 'textbook' ? currentGradeInfo?.name : "Đề mẫu") || '';
  const displayUnitName = savedContext?.unitName || (generationMode === 'textbook' ? currentUnitInfo?.name : (sampleFile?.name || 'Tạo từ ảnh')) || '';

  return (
    <div className="min-h-screen font-sans">
      <Header />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-8">
              <ControlPanel
                selectedGrade={selectedGrade}
                setSelectedGrade={setSelectedGrade}
                selectedUnit={selectedUnit}
                setSelectedUnit={setSelectedUnit}
                numQuestions={numQuestions}
                setNumQuestions={setNumQuestions}
                numOptions={numOptions}
                setNumOptions={setNumOptions}
                customPrompt={customPrompt}
                setCustomPrompt={setCustomPrompt}
                selectedQuestionType={selectedQuestionType}
                setSelectedQuestionType={setSelectedQuestionType}
                onGenerate={handleGenerateQuiz}
                isLoading={isLoading}
                generationMode={generationMode}
                setGenerationMode={setGenerationMode}
                sampleFile={sampleFile}
                setSampleFile={setSampleFile}
              />
            </div>
          </aside>
          
          <div className="lg:col-span-7 mt-10 lg:mt-0">
            {isLoading && <Loader />}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-800 p-6 rounded-r-2xl mb-6 shadow-md transition-all animate-in fade-in slide-in-from-top-4" role="alert">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-bold text-lg">Đã xảy ra lỗi</p>
                    <p className="mt-1 text-red-700">{error}</p>
                    
                    {isKeyError && (
                      <div className="mt-4 p-4 bg-white/50 rounded-xl border border-red-100">
                        <p className="text-sm font-medium mb-3">Bạn có thể cấu hình API Key nhanh bằng nút bên dưới:</p>
                        <button
                          onClick={handleOpenKeyConfig}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Cấu hình API Key
                        </button>
                        <p className="mt-3 text-xs opacity-60 italic">
                          * Lưu ý: Hãy chọn dự án Google Cloud có thiết lập thanh toán.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {quizData && !isLoading && (
              <QuizDisplay 
                quizData={quizData} 
                gradeName={displayGradeName}
                unitName={displayUnitName}
                isSaved={isFromStorage}
                onClearQuiz={handleClearQuiz}
              />
            )}
            {!quizData && !isLoading && !error && (
                <div className="flex items-center justify-center h-full min-h-[400px] rounded-3xl border-2 border-dashed border-slate-200 bg-white">
                    <div className="text-center p-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-4 text-base font-medium text-slate-800">Chưa có đề nào được tạo</h3>
                        <p className="mt-1 text-sm text-slate-400">Sử dụng bảng điều khiển bên cạnh để bắt đầu.</p>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
      <footer className="text-center p-8 text-slate-400 text-sm mt-16 border-t border-slate-100">
        <p>
          Designed by Mr Hoàng - ZL: 0913.885.221 - Fb: <a href="https://www.facebook.com/petnguyenmhoang" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-medium">Nguyễn Hoàng</a>
        </p>
      </footer>
    </div>
  );
};

export default App;
