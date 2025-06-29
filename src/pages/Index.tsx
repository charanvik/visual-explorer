
import React, { useState, useCallback } from 'react';
import { Upload, Leaf, Image as ImageIcon, Loader2, AlertTriangle, Shield, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setAnalysis(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      toast.error('Please select a plant image first');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(selectedImage);
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCorMyOjbOOJDcPkWzz0UzPTKoPEM74z4g`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "You are an expert plant pathologist and agricultural specialist. Analyze this plant image for diseases, pests, or health issues. Please provide a detailed analysis in the following format:\n\n**PLANT IDENTIFICATION:**\n- Plant type/species\n- Growth stage\n\n**DISEASE/ISSUE DETECTED:**\n- Disease name (if any)\n- Severity level (Mild/Moderate/Severe)\n- Confidence level in diagnosis\n\n**SYMPTOMS OBSERVED:**\n- Visible symptoms on leaves, stems, fruits\n- Color changes, spots, wilting, etc.\n\n**POSSIBLE CAUSES:**\n- Pathogen type (fungal, bacterial, viral, pest)\n- Environmental factors\n\n**TREATMENT RECOMMENDATIONS:**\n- Immediate actions needed\n- Organic treatment options\n- Chemical treatment options (if necessary)\n- Application methods and timing\n\n**PREVENTION TIPS:**\n- Cultural practices\n- Crop rotation suggestions\n- Monitoring recommendations\n\n**PROGNOSIS:**\n- Expected recovery time\n- Potential yield impact\n- Spread risk to other plants\n\nIf the image doesn't show a plant or shows a healthy plant, please indicate that clearly."
              },
              {
                inline_data: {
                  mime_type: selectedImage.type,
                  data: base64
                }
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (analysisText) {
        setAnalysis(analysisText);
        toast.success('Plant analysis completed!');
      } else {
        throw new Error('No analysis received');
      }
    } catch (error) {
      console.error('Error analyzing plant:', error);
      toast.error('Failed to analyze plant. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Plant Disease Detector
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered plant health analysis for farmers. Upload a photo of your crops to identify diseases, pests, and get treatment recommendations.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Upload Section */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Upload className="w-6 h-6 text-green-600" />
                Upload Plant Image
              </h2>
              
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  isDragOver
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Plant preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                    />
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => document.getElementById('file-input')?.click()}
                        variant="outline"
                        className="border-green-200 hover:border-green-400"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Change Image
                      </Button>
                      <Button
                        onClick={analyzeImage}
                        disabled={isAnalyzing}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Leaf className="w-4 h-4 mr-2" />
                        )}
                        {isAnalyzing ? 'Analyzing Plant...' : 'Diagnose Plant'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                      <Leaf className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Drop your plant image here, or click to browse
                      </p>
                      <p className="text-sm text-gray-500">
                        Take clear photos of affected leaves, stems, or fruits for best results
                      </p>
                    </div>
                    <Button
                      onClick={() => document.getElementById('file-input')?.click()}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Analysis Section */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-emerald-600" />
                Disease Analysis
              </h2>
              
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full animate-pulse opacity-20"></div>
                  </div>
                  <p className="text-lg font-medium text-gray-700">Analyzing your plant...</p>
                  <p className="text-sm text-gray-500">AI is examining for diseases and health issues</p>
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-green-600" />
                      Diagnosis Report
                    </h3>
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      {analysis.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-3 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={analyzeImage}
                    variant="outline"
                    className="w-full border-green-200 hover:border-green-400"
                    disabled={!selectedImage}
                  >
                    <Leaf className="w-4 h-4 mr-2" />
                    Analyze Again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-500">Ready for diagnosis</p>
                  <p className="text-sm text-gray-400 max-w-sm">
                    Upload a plant image and click "Diagnose Plant" to get detailed health analysis and treatment recommendations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-8">AI-Powered Plant Health Analysis</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Disease Detection</h4>
              <p className="text-sm text-gray-600">Identify fungal, bacterial, and viral diseases with detailed symptom analysis</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Pill className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Treatment Recommendations</h4>
              <p className="text-sm text-gray-600">Get specific treatment options including organic and chemical solutions</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Prevention Tips</h4>
              <p className="text-sm text-gray-600">Learn how to prevent diseases and maintain healthy crops</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
