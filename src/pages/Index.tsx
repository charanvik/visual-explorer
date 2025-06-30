import React, { useState, useCallback, useRef } from 'react';
import { Upload, Leaf, Camera, Loader2, AlertTriangle, Shield, Pill, X, CheckCircle, AlertCircle } from 'lucide-react';
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
      return <Badge variant="destructive" className="ml-2">Severe</Badge>;
    }
    if (lowerContent.includes('moderate')) {
      return <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">Moderate</Badge>;
    }
    if (lowerContent.includes('mild')) {
      return <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">Mild</Badge>;
    }
    if (lowerContent.includes('healthy')) {
      return <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Healthy</Badge>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-green-100 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            <div className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Plant Doctor
            </h1>
          </div>
          <p className="text-sm text-gray-600 text-center mt-2">
            AI-powered plant health analysis for farmers
          </p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Upload Section */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Upload or Capture Image
            </h2>
            
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Plant preview" 
                    className="w-full max-h-64 object-cover rounded-lg shadow-md" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => document.getElementById('file-input')?.click()} 
                    variant="outline" 
                    className="border-green-200 hover:border-green-400" 
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    New Image
                  </Button>
                  <Button 
                    onClick={startCamera} 
                    variant="outline" 
                    className="border-green-200 hover:border-green-400" 
                    size="sm"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Camera
                  </Button>
                </div>
                <Button 
                  onClick={analyzeImage} 
                  disabled={isAnalyzing} 
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Leaf className="w-4 h-4 mr-2" />
                  )}
                  {isAnalyzing ? 'Analyzing...' : 'Diagnose Plant'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <Leaf className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-gray-600 mb-4">
                    Take a clear photo of affected leaves, stems, or fruits
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => document.getElementById('file-input')?.click()} 
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" 
                      size="sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                    <Button 
                      onClick={startCamera} 
                      variant="outline" 
                      className="border-green-200 hover:border-green-400" 
                      size="sm"
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

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-black/50">
              <h3 className="text-white font-semibold">Capture Plant Image</h3>
              <Button onClick={stopCamera} variant="outline" size="sm" className="text-white border-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 relative">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="p-4 bg-black/50">
              <Button onClick={captureImage} className="w-full bg-white text-black hover:bg-gray-100">
                <Camera className="w-4 h-4 mr-2" />
                Capture Image
              </Button>
            </div>
          </div>
        )}

        {/* Loading Analysis */}
        {isAnalyzing && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-700">Analyzing plant...</p>
                <p className="text-sm text-gray-500 text-center">AI is examining for diseases and health issues</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Structured Analysis Results */}
        {analysis && !isAnalyzing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Diagnosis Report</h2>
              <Button 
                onClick={analyzeImage} 
                variant="outline" 
                size="sm" 
                className="border-green-200 hover:border-green-400"
                disabled={!selectedImage}
              >
                <Leaf className="w-4 h-4 mr-2" />
                Re-analyze
              </Button>
            </div>

            {parseAnalysis(analysis).map((section, index) => {
              const getIcon = (title: string) => {
                if (title.includes('IDENTIFICATION')) return <Leaf className="w-5 h-5 text-green-600" />;
                if (title.includes('DISEASE') || title.includes('ISSUE')) return <AlertTriangle className="w-5 h-5 text-red-600" />;
                if (title.includes('SYMPTOMS')) return <AlertCircle className="w-5 h-5 text-orange-600" />;
                if (title.includes('CAUSES')) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
                if (title.includes('TREATMENT')) return <Pill className="w-5 h-5 text-blue-600" />;
                if (title.includes('PREVENTION')) return <Shield className="w-5 h-5 text-green-600" />;
                if (title.includes('PROGNOSIS')) return <CheckCircle className="w-5 h-5 text-purple-600" />;
                return <Leaf className="w-5 h-5 text-gray-600" />;
              };

              const isHighPriority = section.title.includes('DISEASE') || section.title.includes('TREATMENT');

              return (
                <Card key={index} className={`border-0 shadow-md bg-white/90 backdrop-blur-sm ${isHighPriority ? 'ring-2 ring-red-100' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-base font-semibold text-gray-800">
                      {getIcon(section.title)}
                      <span className="ml-2">{section.title}</span>
                      {section.title.includes('DISEASE') && getSeverityBadge(section.content)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {section.content.split('\n').map((line, lineIndex) => {
                        if (line.trim().startsWith('-')) {
                          return (
                            <div key={lineIndex} className="flex items-start gap-2 mb-1">
                              <span className="text-green-600 mt-1.5 text-xs">•</span>
                              <span>{line.trim().substring(1).trim()}</span>
                            </div>
                          );
                        }
                        return line.trim() ? (
                          <p key={lineIndex} className="mb-2 font-medium text-gray-800">
                            {line.trim()}
                          </p>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                  {index < parseAnalysis(analysis).length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Features Section */}
        <div className="grid grid-cols-1 gap-4 mt-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-md text-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Disease Detection</h4>
            <p className="text-xs text-gray-600">Identify fungal, bacterial, and viral diseases</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-md text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Pill className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Treatment Plans</h4>
            <p className="text-xs text-gray-600">Get organic and chemical treatment options</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-md text-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Prevention Tips</h4>
            <p className="text-xs text-gray-600">Learn to prevent diseases and maintain healthy crops</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
