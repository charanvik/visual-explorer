import React, { useState, useCallback, useRef } from 'react';
import { Upload, Leaf, Camera, Loader2, AlertTriangle, Shield, Pill, X, CheckCircle, AlertCircle, Sparkles, Bug, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
      return <Badge className="ml-2 bg-red-100 text-red-800 border-red-200">🚨 Severe</Badge>;
    }
    if (lowerContent.includes('moderate')) {
      return <Badge className="ml-2 bg-orange-100 text-orange-800 border-orange-200">⚠️ Moderate</Badge>;
    }
    if (lowerContent.includes('mild')) {
      return <Badge className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200">⚡ Mild</Badge>;
    }
    if (lowerContent.includes('healthy')) {
      return <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-200">✅ Healthy</Badge>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Enhanced Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                PlantCare AI
              </h1>
              <p className="text-sm text-gray-600 mt-1">Smart Disease Detection</p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-3 max-w-md mx-auto">
            Professional plant health analysis powered by AI for modern farmers
          </p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Enhanced Upload Section */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Upload className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Plant Analysis</h2>
            </div>
            
            {imagePreview ? (
              <div className="space-y-6">
                <div className="relative group">
                  <img 
                    src={imagePreview} 
                    alt="Plant preview" 
                    className="w-full max-h-80 object-cover rounded-2xl shadow-lg border-4 border-white" 
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => document.getElementById('file-input')?.click()} 
                    variant="outline" 
                    className="border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-300" 
                    size="lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    New Photo
                  </Button>
                  <Button 
                    onClick={startCamera} 
                    variant="outline" 
                    className="border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300" 
                    size="lg"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Camera
                  </Button>
                </div>
                <Button 
                  onClick={analyzeImage} 
                  disabled={isAnalyzing} 
                  className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:via-green-700 hover:to-teal-700 text-white font-semibold py-4 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-300"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Analyzing Plant...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-3" />
                      Start AI Diagnosis
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border-3 border-dashed border-emerald-200 rounded-2xl p-12 text-center bg-gradient-to-br from-emerald-50/50 to-green-50/50">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <Leaf className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Upload Plant Image</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Take a clear photo of affected leaves, stems, or fruits for accurate diagnosis
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <Button 
                      onClick={() => document.getElementById('file-input')?.click()} 
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-lg" 
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Gallery
                    </Button>
                    <Button 
                      onClick={startCamera} 
                      variant="outline" 
                      className="border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 font-semibold py-3 rounded-xl" 
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Camera
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

        {/* Enhanced Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-sm">
              <h3 className="text-white font-bold text-lg">📸 Capture Plant Image</h3>
              <Button onClick={stopCamera} variant="outline" size="sm" className="text-white border-white/50 hover:bg-white/20">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 relative">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-white/50 rounded-2xl"></div>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-sm">
              <Button onClick={captureImage} className="w-full bg-white text-black hover:bg-gray-100 font-bold py-4 rounded-xl">
                <Camera className="w-5 h-5 mr-3" />
                Capture Image
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Loading Analysis */}
        {isAnalyzing && (
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
            <CardContent className="p-8 relative">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full opacity-20 animate-pulse"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-bold text-gray-800">🔍 AI Analysis in Progress</p>
                  <p className="text-gray-600">Examining plant health and identifying potential issues...</p>
                </div>
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`w-2 h-2 bg-emerald-600 rounded-full animate-bounce`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Structured Analysis Results */}
        {analysis && !isAnalyzing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">📋 Diagnosis Report</h2>
                  <p className="text-sm text-gray-600">Comprehensive plant health analysis</p>
                </div>
              </div>
              <Button 
                onClick={analyzeImage} 
                variant="outline" 
                size="sm" 
                className="border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50"
                disabled={!selectedImage}
              >
                <Leaf className="w-4 h-4 mr-2" />
                Re-analyze
              </Button>
            </div>

            {parseAnalysis(analysis).map((section, index) => {
              const getIcon = (title: string) => {
                if (title.includes('IDENTIFICATION')) return <Leaf className="w-6 h-6 text-emerald-600" />;
                if (title.includes('DISEASE') || title.includes('ISSUE')) return <Bug className="w-6 h-6 text-red-600" />;
                if (title.includes('SYMPTOMS')) return <AlertCircle className="w-6 h-6 text-orange-600" />;
                if (title.includes('CAUSES')) return <AlertTriangle className="w-6 h-6 text-amber-600" />;
                if (title.includes('TREATMENT')) return <Pill className="w-6 h-6 text-blue-600" />;
                if (title.includes('PREVENTION')) return <Shield className="w-6 h-6 text-green-600" />;
                if (title.includes('PROGNOSIS')) return <CheckCircle className="w-6 h-6 text-purple-600" />;
                return <Leaf className="w-6 h-6 text-gray-600" />;
              };

              const getGradient = (title: string) => {
                if (title.includes('DISEASE') || title.includes('TREATMENT')) return 'from-red-500/10 to-pink-500/10';
                if (title.includes('PREVENTION')) return 'from-green-500/10 to-emerald-500/10';
                if (title.includes('IDENTIFICATION')) return 'from-blue-500/10 to-cyan-500/10';
                return 'from-gray-500/10 to-slate-500/10';
              };

              const isHighPriority = section.title.includes('DISEASE') || section.title.includes('TREATMENT');

              return (
                <Card key={index} className={`border-0 shadow-lg bg-white/95 backdrop-blur-sm overflow-hidden transform hover:scale-[1.01] transition-all duration-300 ${isHighPriority ? 'ring-2 ring-red-200' : ''}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(section.title)}`}></div>
                  <CardHeader className="pb-4 relative">
                    <CardTitle className="flex items-center text-lg font-bold text-gray-800">
                      <div className="p-2 bg-white rounded-xl shadow-sm mr-3">
                        {getIcon(section.title)}
                      </div>
                      <span>{section.title}</span>
                      {section.title.includes('DISEASE') && getSeverityBadge(section.content)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 relative">
                    <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                      {section.content.split('\n').map((line, lineIndex) => {
                        if (line.trim().startsWith('-')) {
                          return (
                            <div key={lineIndex} className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                              <span className="text-emerald-600 mt-1 text-lg">•</span>
                              <span className="flex-1">{line.trim().substring(1).trim()}</span>
                            </div>
                          );
                        }
                        return line.trim() ? (
                          <p key={lineIndex} className="font-semibold text-gray-800 bg-white/40 rounded-lg p-3">
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
        )}

        {/* Enhanced Features Section */}
        <div className="mt-12">
          <h3 className="text-center text-xl font-bold text-gray-800 mb-6">🌟 Why Choose PlantCare AI?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bug className="w-7 h-7 text-red-600" />
              </div>
              <h4 className="font-bold text-gray-800 mb-3 text-center">🔍 Disease Detection</h4>
              <p className="text-sm text-gray-600 text-center">Advanced AI identifies fungal, bacterial, viral diseases and pest infestations with high accuracy</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Pill className="w-7 h-7 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-800 mb-3 text-center">💊 Smart Treatment</h4>
              <p className="text-sm text-gray-600 text-center">Get personalized organic and chemical treatment recommendations with application timing</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-800 mb-3 text-center">🛡️ Prevention Guide</h4>
              <p className="text-sm text-gray-600 text-center">Learn proactive measures, crop rotation tips, and monitoring strategies for healthy plants</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            Powered by Advanced AI • Trusted by Farmers Worldwide 🌱
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
