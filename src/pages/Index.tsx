import React, { useState, useCallback, useRef } from 'react';
import { Upload, Leaf, Camera, Loader2, AlertTriangle, Shield, Pill, X, CheckCircle, AlertCircle, Bug, ArrowLeft, Video } from 'lucide-react';
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
          width: {
            ideal: 1280
          },
          height: {
            ideal: 720
          }
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
            const file = new File([blob], 'camera-capture.jpg', {
              type: 'image/jpeg'
            });
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
        headers: {
          'Content-Type': 'application/json'
        },
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
        toast.success('Analysis completed successfully!');
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
    const parsedSections: {
      title: string;
      content: string;
    }[] = [];
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
      return <Badge className="bg-red-500 text-white text-xs px-2 py-1">Severe</Badge>;
    }
    if (lowerContent.includes('moderate')) {
      return <Badge className="bg-orange-500 text-white text-xs px-2 py-1">Moderate</Badge>;
    }
    if (lowerContent.includes('mild')) {
      return <Badge className="bg-yellow-600 text-white text-xs px-2 py-1">Mild</Badge>;
    }
    if (lowerContent.includes('healthy')) {
      return <Badge className="bg-green-500 text-white text-xs px-2 py-1">Healthy</Badge>;
    }
    return null;
  };
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center shadow-sm">
        
        <h1 className="text-xl font-medium text-lime-500">Plant Disease Diagnosis</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Main Upload Card */}
        <Card className="bg-white rounded-2xl shadow-sm border-0 overflow-hidden">
          <CardContent className="p-0">
            {showCamera ? <div className="relative h-80 rounded-2xl overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/80 rounded-xl"></div>
                </div>
                <Button onClick={stopCamera} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white p-0">
                  <X className="w-5 h-5" />
                </Button>
              </div> : imagePreview ? <div className="relative">
                <img src={imagePreview} alt="Plant preview" className="w-full h-64 object-cover rounded-2xl" />
                <Button onClick={() => {
              setImagePreview(null);
              setSelectedImage(null);
              setAnalysis(null);
            }} size="sm" variant="secondary" className="absolute top-4 right-4 w-8 h-8 rounded-full p-0 bg-black/40 border-0 text-white hover:bg-black/60">
                  <X className="w-4 h-4" />
                </Button>
              </div> : <div className="relative h-80 rounded-2xl overflow-hidden">
                <div className="w-full h-full bg-cover bg-center flex items-center justify-center" style={{
              backgroundImage: "url('/lovable-uploads/8ed8f311-bd71-4966-9941-69370f7cfd2e.png')"
            }}>
                  <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 flex gap-6">
                    <button onClick={() => document.getElementById('file-input')?.click()} className="flex flex-col items-center gap-3 text-white hover:scale-105 transition-transform">
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                        <Upload className="w-8 h-8" />
                      </div>
                      <span className="font-medium">Upload Image</span>
                    </button>
                    
                    <button onClick={startCamera} className="flex flex-col items-center gap-3 text-white hover:scale-105 transition-transform">
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                        <Camera className="w-8 h-8" />
                      </div>
                      <span className="font-medium">Take Photo</span>
                    </button>
                  </div>
                </div>
              </div>}
            <input id="file-input" type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
          </CardContent>
        </Card>

        {/* Capture/Analyze Button */}
        {showCamera && <Button onClick={captureImage} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-medium text-lg">
            <Camera className="w-6 h-6 mr-3" />
            Capture Image
          </Button>}

        {selectedImage && !showCamera && <Button onClick={analyzeImage} disabled={isAnalyzing} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-medium text-lg disabled:opacity-50">
            {isAnalyzing ? <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                Analyzing...
              </> : 'Get Diagnosis'}
          </Button>}

        {/* Info Section */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">For Gardeners and Farmers</h2>
          <p className="text-gray-600 text-lg leading-relaxed px-2">
            Upload a picture of your plant to identify diseases and get treatment recommendations.
          </p>
        </div>

        {/* Results */}
        {analysis && !isAnalyzing && <div className="space-y-4">
            <div className="text-center py-4">
              <h3 className="text-xl font-medium text-gray-900 mb-1">Analysis Complete</h3>
              <p className="text-gray-600 text-sm">Here's what we found</p>
            </div>

            {parseAnalysis(analysis).map((section, index) => {
          const getIcon = (title: string) => {
            if (title.includes('IDENTIFICATION')) return <Leaf className="w-5 h-5 text-green-600" />;
            if (title.includes('DISEASE') || title.includes('ISSUE')) return <Bug className="w-5 h-5 text-red-600" />;
            if (title.includes('SYMPTOMS')) return <AlertCircle className="w-5 h-5 text-orange-600" />;
            if (title.includes('CAUSES')) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
            if (title.includes('TREATMENT')) return <Pill className="w-5 h-5 text-blue-600" />;
            if (title.includes('PREVENTION')) return <Shield className="w-5 h-5 text-green-600" />;
            if (title.includes('PROGNOSIS')) return <CheckCircle className="w-5 h-5 text-purple-600" />;
            return <Leaf className="w-5 h-5 text-gray-600" />;
          };
          const isHighPriority = section.title.includes('DISEASE') || section.title.includes('TREATMENT');
          return <Card key={index} className={`bg-white rounded-lg shadow-sm border-0 ${isHighPriority ? 'ring-1 ring-red-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                          {getIcon(section.title)}
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm">{section.title}</h4>
                      </div>
                      {section.title.includes('DISEASE') && getSeverityBadge(section.content)}
                    </div>
                    <div className="ml-13 space-y-2">
                      {section.content.split('\n').map((line, lineIndex) => {
                  if (line.trim().startsWith('-')) {
                    return <div key={lineIndex} className="flex items-start space-x-2 py-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-gray-700 text-sm leading-relaxed">{line.trim().substring(1).trim()}</span>
                            </div>;
                  }
                  return line.trim() ? <p key={lineIndex} className="font-medium text-gray-800 text-sm mb-1">
                            {line.trim()}
                          </p> : null;
                })}
                    </div>
                  </CardContent>
                </Card>;
        })}
          </div>}

        {/* Bottom padding */}
        <div className="h-8"></div>
      </div>
    </div>;
};
export default Index;
