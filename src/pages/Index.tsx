
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Leaf, Camera, Loader2, AlertTriangle, Shield, Pill, X, CheckCircle, AlertCircle, Sparkles, Bug, Eye, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = e => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setAnalysis(null);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            handleImageUpload(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      toast.error('Please select a plant image first');
      return;
    }
    setIsAnalyzing(true);
    try {
      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(selectedImage);
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCorMyOjbOOJDcPkWzz0UzPTKoPEM74z4g`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "You are an expert plant pathologist and agricultural specialist. Analyze this plant image for diseases, pests, or health issues. Please provide a detailed analysis in the following format:\n\n**PLANT IDENTIFICATION:**\n- Plant type/species\n- Growth stage\n\n**DISEASE/ISSUE DETECTED:**\n- Disease name (if any)\n- Severity level (Mild/Moderate/Severe)\n- Confidence level in diagnosis\n\n**SYMPTOMS OBSERVED:**\n- Visible symptoms on leaves, stems, fruits\n- Color changes, spots, wilting, etc.\n\n**POSSIBLE CAUSES:**\n- Pathogen type (fungal, bacterial, viral, pest)\n- Environmental factors\n\n**TREATMENT RECOMMENDATIONS:**\n- Immediate actions needed\n- Organic treatment options\n- Chemical treatment options (if necessary)\n- Application methods and timing\n\n**PREVENTION TIPS:**\n- Cultural practices\n- Crop rotation suggestions\n- Monitoring recommendations\n\n**PROGNOSIS:**\n- Expected recovery time\n- Potential yield impact\n- Spread risk to other plants\n\nIf the image doesn't show a plant or shows a healthy plant, please indicate that clearly."
            }, {
              inline_data: {
                mime_type: selectedImage.type,
                data: base64
              }
            }]
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

  const parseAnalysis = (text: string) => {
    const sections = text.split('**').filter(section => section.trim());
    const parsedSections: { title: string; content: string; }[] = [];
    
    for (let i = 0; i < sections.length; i += 2) {
      if (sections[i] && sections[i + 1]) {
        parsedSections.push({
          title: sections[i].replace(':', '').trim(),
          content: sections[i + 1].trim()
        });
      }
    }
    return parsedSections;
  };

  const getSeverityBadge = (content: string) => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('severe')) {
      return <Badge variant="destructive" className="ml-auto">Severe</Badge>;
    }
    if (lowerContent.includes('moderate')) {
      return <Badge className="ml-auto bg-orange-500 hover:bg-orange-600">Moderate</Badge>;
    }
    if (lowerContent.includes('mild')) {
      return <Badge className="ml-auto bg-yellow-500 hover:bg-yellow-600">Mild</Badge>;
    }
    if (lowerContent.includes('healthy')) {
      return <Badge className="ml-auto bg-green-500 hover:bg-green-600">Healthy</Badge>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Modern Header */}
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-40 backdrop-blur-xl bg-white/95">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">PlantCare AI</h1>
                <p className="text-sm text-slate-500">Smart Disease Detection</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-4xl font-bold text-slate-900 leading-tight">
            Diagnose Plant Issues
            <span className="block text-emerald-600">Instantly with AI</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload or capture a photo of your plant to get professional-grade disease detection and treatment recommendations.
          </p>
        </div>

        {/* Upload Section */}
        <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50">
          <CardContent className="p-0">
            {imagePreview ? (
              <div className="space-y-6 p-6">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Plant preview" 
                    className="w-full h-80 object-cover rounded-2xl" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => document.getElementById('file-input')?.click()} 
                    variant="outline" 
                    className="flex-1 h-12 border-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Photo
                  </Button>
                  <Button 
                    onClick={startCamera} 
                    variant="outline" 
                    className="flex-1 h-12 border-2"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
                <Button 
                  onClick={analyzeImage} 
                  disabled={isAnalyzing} 
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/25"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-3" />
                      Analyze Plant
                      <ArrowRight className="w-5 h-5 ml-3" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-3xl flex items-center justify-center">
                    <Leaf className="w-12 h-12 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Upload Plant Image</h3>
                    <p className="text-slate-600">
                      Take a clear photo of affected leaves, stems, or fruits for accurate diagnosis
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => document.getElementById('file-input')?.click()} 
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                    <Button 
                      onClick={startCamera} 
                      variant="outline" 
                      className="flex-1 h-12 border-2"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <input 
              id="file-input" 
              type="file" 
              accept="image/*" 
              onChange={handleFileInput} 
              className="hidden" 
            />
          </CardContent>
        </Card>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex items-center justify-between p-6">
              <h3 className="text-white font-semibold text-lg">Capture Plant Image</h3>
              <Button onClick={stopCamera} variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 relative">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/50 rounded-3xl"></div>
              </div>
            </div>
            <div className="p-6">
              <Button onClick={captureImage} className="w-full h-14 bg-white text-black hover:bg-gray-100 font-semibold rounded-2xl">
                <Camera className="w-5 h-5 mr-3" />
                Capture Image
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <Card className="border-0 shadow-xl shadow-slate-200/50">
            <CardContent className="p-12 text-center">
              <div className="space-y-6">
                <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Analyzing Your Plant</h3>
                  <p className="text-slate-600">AI is examining the image for diseases and health issues...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysis && !isAnalyzing && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-slate-900 mb-2">Diagnosis Complete</h3>
              <p className="text-slate-600">Here's what we found about your plant's health</p>
            </div>

            <div className="grid gap-6">
              {parseAnalysis(analysis).map((section, index) => {
                const getIcon = (title: string) => {
                  if (title.includes('IDENTIFICATION')) return <Leaf className="w-5 h-5 text-emerald-600" />;
                  if (title.includes('DISEASE') || title.includes('ISSUE')) return <Bug className="w-5 h-5 text-red-600" />;
                  if (title.includes('SYMPTOMS')) return <AlertCircle className="w-5 h-5 text-orange-600" />;
                  if (title.includes('CAUSES')) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
                  if (title.includes('TREATMENT')) return <Pill className="w-5 h-5 text-blue-600" />;
                  if (title.includes('PREVENTION')) return <Shield className="w-5 h-5 text-green-600" />;
                  if (title.includes('PROGNOSIS')) return <CheckCircle className="w-5 h-5 text-purple-600" />;
                  return <Leaf className="w-5 h-5 text-slate-600" />;
                };

                const isHighPriority = section.title.includes('DISEASE') || section.title.includes('TREATMENT');

                return (
                  <Card key={index} className={`border-0 shadow-lg shadow-slate-200/50 ${isHighPriority ? 'ring-2 ring-red-100' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                            {getIcon(section.title)}
                          </div>
                          <h4 className="font-bold text-slate-900">{section.title}</h4>
                        </div>
                        {section.title.includes('DISEASE') && getSeverityBadge(section.content)}
                      </div>
                      <div className="prose prose-slate max-w-none">
                        {section.content.split('\n').map((line, lineIndex) => {
                          if (line.trim().startsWith('-')) {
                            return (
                              <div key={lineIndex} className="flex items-start space-x-3 py-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-slate-700">{line.trim().substring(1).trim()}</span>
                              </div>
                            );
                          }
                          return line.trim() ? (
                            <p key={lineIndex} className="font-medium text-slate-800 mb-2">
                              {line.trim()}
                            </p>
                          ) : null;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">Why Choose PlantCare AI?</h3>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Professional-grade plant disease detection powered by advanced AI technology
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center">
                <Bug className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Disease Detection</h4>
              <p className="text-slate-600">
                Advanced AI identifies fungal, bacterial, viral diseases and pest infestations with high accuracy
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center">
                <Pill className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Smart Treatment</h4>
              <p className="text-slate-600">
                Get personalized organic and chemical treatment recommendations with application timing
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Prevention Guide</h4>
              <p className="text-slate-600">
                Learn proactive measures, crop rotation tips, and monitoring strategies for healthy plants
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-slate-500">
            Powered by Advanced AI • Trusted by Farmers Worldwide
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
