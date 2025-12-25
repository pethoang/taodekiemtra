import React, { useState, useMemo } from 'react';
import { QuizData, QuestionType } from '../types';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import saveAs from 'file-saver';

interface QuizDisplayProps {
  quizData: QuizData;
  gradeName: string;
  unitName: string;
  isSaved: boolean;
  onClearQuiz: () => void;
}

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth="2"
        stroke="currentColor" 
        {...props}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);


const QuizDisplay: React.FC<QuizDisplayProps> = ({ quizData, gradeName, unitName, isSaved, onClearQuiz }) => {
  const [activeTab, setActiveTab] = useState<'quiz' | 'answers'>('quiz');

  const questionType = useMemo((): QuestionType => {
    if (!quizData?.quiz?.[0]) return 'multiple-choice'; // Default
    const options = quizData.quiz[0].options;
    if (options.length === 0) return 'fill-in-the-blank';
    return 'multiple-choice';
  }, [quizData]);

  const sanitizeFilename = (name: string): string => {
    if (!name) return '';
    return name.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  };

  const handleDownloadQuiz = async () => {
    const docChildren = quizData.quiz.flatMap((item, index) => {
      const questionText = [
        new TextRun({
          text: `Câu ${index + 1}: `,
          bold: true,
        }),
        new TextRun(item.question),
      ];

      const optionsText = item.options.map((option, optionIndex) => {
        return new Paragraph({
          text: `${String.fromCharCode(65 + optionIndex)}. ${option.replace(/^[A-D]\.\s*/, '')}`,
          indent: { left: 720 },
        });
      });

      return [
        new Paragraph({ children: questionText, spacing: { after: 200 } }),
        ...(optionsText.length > 0 ? optionsText : [new Paragraph({text: ""})]),
        new Paragraph({ text: "" })
      ];
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "ĐỀ KIỂM TRA",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }),
          ...docChildren
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `DeKiemTra_${sanitizeFilename(gradeName)}_${sanitizeFilename(unitName)}.docx`;
    saveAs(blob, fileName);
  };

  const handleDownloadAnswers = async () => {
    const docChildren = [
      new Paragraph({
        text: "ĐÁP ÁN",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      }),
      ...quizData.quiz.map((item, index) => {
        const answerLetter = item.options.findIndex(opt => opt === item.answer);
        const displayAnswer = answerLetter !== -1 
          ? String.fromCharCode(65 + answerLetter) 
          : item.answer;

        return new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. `,
              bold: true,
            }),
            new TextRun(displayAnswer),
          ]
        })
      })
    ];

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `DapAn_${sanitizeFilename(gradeName)}_${sanitizeFilename(unitName)}.docx`;
    saveAs(blob, fileName);
  };

  const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ isActive, onClick, children }) => (
    <button
      onClick={onClick}
      className={`relative w-1/2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
        isActive ? 'bg-white text-sky-600 shadow-sm font-semibold' : 'bg-transparent text-slate-600 hover:bg-white/50'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center gap-3 flex-wrap">
          <div>
            {isSaved && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Đã lưu
                </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQuiz}
              className="inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-sky-600 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200"
            >
              <DownloadIcon className="h-4 w-4 mr-1.5" />
              Tải Đề
            </button>
            <button
              onClick={handleDownloadAnswers}
              className="inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-sky-600 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200"
            >
              <DownloadIcon className="h-4 w-4 mr-1.5" />
              Tải Đáp án
            </button>
             <button
                onClick={onClearQuiz}
                title="Xóa đề đã lưu và tạo đề mới"
                className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-lg text-red-500 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
          </div>
      </div>
      
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100">
        <div className="w-full max-w-sm mx-auto bg-slate-200/60 rounded-xl p-1.5 flex space-x-1">
          <TabButton isActive={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')}>
            Đề kiểm tra
          </TabButton>
          <TabButton isActive={activeTab === 'answers'} onClick={() => setActiveTab('answers')}>
            Đáp án
          </TabButton>
        </div>
      </div>
      

      <div className="p-6 sm:p-8 transition-all duration-300">
        {activeTab === 'quiz' && (
          <div className="divide-y divide-slate-200">
            {quizData.quiz.map((item, index) => (
              <div key={index} className="py-6 first:pt-0 last:pb-0">
                <p className="font-medium text-slate-900 leading-relaxed">
                  <span className="font-bold">Câu {index + 1}:</span> {item.question}
                </p>
                {questionType === 'fill-in-the-blank' ? (
                  <div className="mt-4 pl-5">
                    <p className="text-slate-500 italic">(Điền vào chỗ trống)</p>
                  </div>
                ) : (
                  <ol className="space-y-3 pl-5 mt-4 list-[upper-alpha]">
                    {item.options.map((option, optionIndex) => (
                      <li key={optionIndex} className="text-slate-700 leading-relaxed">
                        {option.replace(/^[A-D]\.\s*/, '')}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'answers' && (
          <div>
             <h3 className="text-xl font-bold text-slate-800 mb-6">Bảng đáp án</h3>
             <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {quizData.quiz.map((item, index) => {
                    const answerLetter = item.options.findIndex(opt => opt === item.answer);
                    const displayAnswer = answerLetter !== -1 
                      ? String.fromCharCode(65 + answerLetter) 
                      : item.answer;
                    
                    return (
                        <li key={index} className="flex items-center justify-center p-3 bg-white rounded-lg border border-slate-200 text-center shadow-sm">
                            <span className="font-bold text-slate-800">{index + 1}.</span> 
                            <span className="ml-2 text-green-700 font-semibold">{displayAnswer}</span>
                        </li>
                    )
                })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizDisplay;
