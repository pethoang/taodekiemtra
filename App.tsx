
import React, { useState, useCallback, useEffect } from 'react';
import { TEXTBOOK_DATA } from './constants';
import { Grade, QuizData, SavedQuiz, QuestionType, GenerationMode } from './types';
import { generateQuiz } from './services/geminiService';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import QuizDisplay from './components/QuizDisplay';
import Loader from './components/Loader';

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
  const [isFromStorage, setIsFromStorage] = useState<boolean>(false);
  const [savedContext, setSavedContext] = useState<{ gradeName: string; unitName: string} | null>(null);

  useEffect(() => {
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

  const handleGenerateQuiz = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setQuizData(null);
    setIsFromStorage(false);
    setSavedContext(null);

    const gradeInfo = TEXTBOOK_DATA.find(g => g.grade === selectedGrade);
    const unitInfo = gradeInfo?.units.find(u => u.id === selectedUnit);

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
        gradeName: generationMode === 'textbook' ? (gradeInfo?.name || '') : "Đề mẫu",
        unitName: generationMode === 'textbook' ? (unitInfo?.name || '') : (sampleFile?.name || 'Tạo từ ảnh'),
      };
      localStorage.setItem('savedQuiz', JSON.stringify(dataToSave));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã có lỗi xảy ra. Vui lòng kiểm tra lại cấu hình API_KEY trên Vercel.");
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
              <div className="bg-red-50 border-l-4 border-red-400 text-red-800 p-6 rounded-r-2xl mb-6 shadow-md" role="alert">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-bold text-lg">Đã xảy ra lỗi</p>
                    <p className="mt-1 text-red-700">{error}</p>
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
                        <h3 className="mt-4 text-base font-medium text-slate-800">Sẵn sàng tạo đề</h3>
                        <p className="mt-1 text-sm text-slate-400">Chọn nội dung bên trái và nhấn nút "Tạo Đề Nhanh".</p>
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
