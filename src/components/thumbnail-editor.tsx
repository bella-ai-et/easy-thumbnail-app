import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Text, Arrow, Rect } from "react-konva";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { Credits } from "./credits";
import { Download, Pencil, Square, Type as TypeIcon, ArrowRight, Eraser, Image as ImageIcon } from "lucide-react";
import { useToast } from "./ui/toast";

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const TOOLS = {
  PENCIL: "pencil",
  TEXT: "text",
  ARROW: "arrow",
  RECT: "rect",
  ERASER: "eraser",
};

export default function ThumbnailEditor() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Query for any processing images to maintain refresh resilience
  const userProcessingImages = useQuery(
    api.files.getUserProcessingImages,
    isSignedIn && userId ? { userId } : "skip"
  );

  // Convex mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveUploadedImage = useMutation(api.files.saveUploadedImage);
  const saveMergedImage = useMutation(api.files.saveMergedImage);
  const generateThumbnail = useMutation(api.files.generateThumbnail);
  const storeUser = useMutation(api.files.storeUser);
  
  // Get user's credit status
  const userCreditsStatus = useQuery(api.transactions.getUserCreditsStatus);
  
  // Reference image state
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
  const [refStorageId, setRefStorageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);

  // Canvas state
  const stageRef = useRef<any>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [lines, setLines] = useState<{id: number, points: number[], tool: string}[]>([]);
  const [currentLine, setCurrentLine] = useState<number[] | null>(null);
  const [texts, setTexts] = useState<{ id: number; text: string; x: number; y: number; fontSize: number; fill: string }[]>([]);
  const [arrows, setArrows] = useState<{ id: number; points: number[]; stroke: string; strokeWidth: number }[]>([]);
  const [rectangles, setRectangles] = useState<{ id: number; x: number; y: number; width: number; height: number; fill: string }[]>([]);
  const [currentTool, setCurrentTool] = useState<string>(TOOLS.PENCIL);
  const [arrowStart, setArrowStart] = useState<[number, number] | null>(null);
  const [rectStart, setRectStart] = useState<[number, number] | null>(null);
  const [currentStrokeColor, setCurrentStrokeColor] = useState<string>("#ff0000");
  const [currentFillColor, setCurrentFillColor] = useState<string>("#ffcc00");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [fontSize, setFontSize] = useState<number>(30);
  
  // Get image details from the database
  const imageDetails = useQuery(
    api.files.getImageByStorageId,
    imageId ? { storageId: imageId } : "skip"
  );

  // Store user in Convex when they sign in
  useEffect(() => {
    if (isSignedIn && user) {
      storeUser({
        name: user.fullName || user.username || "Anonymous",
        email: user.primaryEmailAddress?.emailAddress || "",
        clerkId: userId || "",
      });
    }
  }, [isSignedIn, user, userId, storeUser]);

  // Load reference image into Konva
  useEffect(() => {
    if (refImageUrl) {
      const img = new window.Image();
      img.src = refImageUrl;
      img.crossOrigin = "Anonymous";
      img.onload = () => setImgObj(img);
    }
  }, [refImageUrl]);

  // Update thumbnailUrl when imageDetails changes
  useEffect(() => {
    if (imageDetails) {
      if (imageDetails.status === "completed" && imageDetails.cartoonImageUrl) {
        console.log("Setting thumbnail image from database:", imageDetails.cartoonImageUrl);
        setThumbnailUrl(imageDetails.cartoonImageUrl);
        setIsProcessing(false);
        setImageId(null);
      } else if (imageDetails.status === "processing") {
        console.log("Image is still being processed, waiting for completion...");
        setIsProcessing(true);
      } else if (imageDetails.status === "error") {
        console.error("Error processing image");
        setIsProcessing(false);
        addToast(
          "There was an error processing your image. Please try again.",
          "error"
        );
        setImageId(null);
      }
    }
  }, [imageDetails, addToast]);

  // On mount or refresh, restore pending thumbnail state
  useEffect(() => {
    if (userProcessingImages && userProcessingImages.length > 0) {
      const pending = userProcessingImages.find(img => img.type === "thumbnail");
      if (pending) {
        setIsProcessing(true);
        if (pending.originalStorageId) {
          setRefStorageId(pending.originalStorageId);
        }
        if (pending.originalImageUrl) {
          setRefImageUrl(pending.originalImageUrl);
        }
        addToast(
          <div className="space-y-2">
            <p>Your thumbnail is still being generated.</p>
            <p>You can safely refresh or come back later in your dashboard.</p>
            <Button 
              className="mt-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] hover:cursor-pointer text-white text-xs py-1 px-3"
              onClick={() => window.location.href = "/dashboard"}
            >
              Go to Dashboard
            </Button>
          </div>,
          "info",
          0 // 0 means it won't auto-close
        );
      }
    }
  }, [userProcessingImages, addToast]);

  // Handle original image upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if user is authenticated
    if (!isSignedIn) {
      addToast(
        "Please sign in to generate thumbnails",
        "error"
      );
      return;
    }
    
    // Check if user has enough credits
    if (userCreditsStatus && userCreditsStatus.remainingCredits <= 0) {
      addToast(
        "Please purchase more credits to continue.",
        "error"
      );
      return;
    }

    setIsProcessing(true);
    setThumbnailUrl(null);
    
    try {
      // Display the image preview locally
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setRefImageUrl(imageData);
      };
      reader.readAsDataURL(file);

      // Upload to Convex
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      const { storageId } = await result.json();
      
      // Save image metadata
      if (userId) {
        await saveUploadedImage({
          storageId,
          userId,
        });
        setRefStorageId(storageId);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setIsProcessing(false);
      addToast(
        "Failed to upload image. Please try again.",
        "error"
      );
    }
  };

  // Drawing handlers
  const handleMouseDown = (e: any) => {
    if (!imgObj) return;
    
    const pos = e.target.getStage().getPointerPosition();
    
    if (currentTool === TOOLS.PENCIL) {
      setCurrentLine([pos.x, pos.y]);
    } else if (currentTool === TOOLS.ARROW) {
      setArrowStart([pos.x, pos.y]);
    } else if (currentTool === TOOLS.RECT) {
      setRectStart([pos.x, pos.y]);
    } else if (currentTool === TOOLS.TEXT) {
      const text = prompt("Enter text:", "Your text here");
      if (text) {
        setTexts([
          ...texts,
          { 
            id: Date.now(), 
            text, 
            x: pos.x, 
            y: pos.y, 
            fontSize: fontSize,
            fill: currentStrokeColor
          }
        ]);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    if (!imgObj) return;
    
    const pos = e.target.getStage().getPointerPosition();
    
    if (currentTool === TOOLS.PENCIL && currentLine) {
      setCurrentLine([...currentLine, pos.x, pos.y]);
    } else if (currentTool === TOOLS.ARROW && arrowStart) {
      // Just for visual feedback, actual arrow will be created on mouse up
    } else if (currentTool === TOOLS.RECT && rectStart) {
      // Just for visual feedback, actual rectangle will be created on mouse up
    }
  };

  const handleMouseUp = (e: any) => {
    if (!imgObj) return;
    
    const pos = e.target.getStage().getPointerPosition();
    
    if (currentTool === TOOLS.PENCIL && currentLine) {
      setLines([...lines, { id: Date.now(), points: currentLine, tool: TOOLS.PENCIL }]);
      setCurrentLine(null);
    } else if (currentTool === TOOLS.ARROW && arrowStart) {
      setArrows([
        ...arrows,
        { 
          id: Date.now(), 
          points: [arrowStart[0], arrowStart[1], pos.x, pos.y],
          stroke: currentStrokeColor,
          strokeWidth: strokeWidth
        }
      ]);
      setArrowStart(null);
    } else if (currentTool === TOOLS.RECT && rectStart) {
      const width = pos.x - rectStart[0];
      const height = pos.y - rectStart[1];
      
      setRectangles([
        ...rectangles,
        {
          id: Date.now(),
          x: rectStart[0],
          y: rectStart[1],
          width,
          height,
          fill: currentFillColor
        }
      ]);
      setRectStart(null);
    }
  };

  const clearCanvas = () => {
    setLines([]);
    setTexts([]);
    setArrows([]);
    setRectangles([]);
  };

  const handleGenerateThumbnail = async () => {
    if (!refStorageId || !stageRef.current || !isSignedIn) {
      addToast(
        "Please upload an image first and sign in",
        "error"
      );
      return;
    }
    
    // Check credits
    if (userCreditsStatus && userCreditsStatus.remainingCredits <= 0) {
      addToast(
        "Please purchase more credits to continue.",
        "error"
      );
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Export canvas as image
      const dataURL = stageRef.current.toDataURL({
        pixelRatio: 2,
        mimeType: "image/png"
      });
      
      // Convert dataURL to blob
      const blob = await (async (dataUrl: string) => {
        const res = await fetch(dataUrl);
        return await res.blob();
      })(dataURL);
      
      // Upload merged image to Convex
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
        },
        body: blob,
      });
      
      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }
      
      const { storageId: mergedStorageId } = await result.json();
      
      // Save merged image reference
      await saveMergedImage({
        storageId: mergedStorageId,
        referenceStorageId: refStorageId,
      });
      
      // Generate thumbnail
      const response = await generateThumbnail({ storageId: refStorageId });
      
      if (response.success) {
        addToast(
          <div className="space-y-2">
            <p>Your thumbnail is being generated.</p>
            <p>You can safely refresh or come back later in your dashboard.</p>
            <Button 
              className="mt-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] hover:cursor-pointer text-white text-xs py-1 px-3"
              onClick={() => window.location.href = "/dashboard"}
            >
              Go to Dashboard
            </Button>
          </div>,
          "info",
          0 // 0 means it won't auto-close
        );
        
        // Set imageId to track the status
        setImageId(refStorageId);
      }
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      setIsProcessing(false);
      addToast(
        "Failed to generate thumbnail. Please try again.",
        "error"
      );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)]">
      <main className="w-full py-12 px-4">
        {/* Hero Section */}
        <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-14 px-4 sm:px-0">
          <div className="inline-flex items-center gap-2 rounded-[20px] bg-[var(--color-primary)]/10 px-4 py-2 mb-4 sm:mb-6">
            <span className="text-sm font-medium text-[var(--color-primary)]">
              Create professional thumbnails
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight text-[var(--color-neutral-900)] text-balance">
            YouTube Thumbnail Generator
          </h1>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base text-[var(--color-neutral-600)] max-w-lg mx-auto leading-relaxed">
            Upload an image, add annotations, text, and shapes, then generate a professional YouTube thumbnail.
          </p>
        </div>
        
        {/* Main content area */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="relative rounded-xl shadow-sm border border-[var(--color-neutral-100)] overflow-hidden card p-6">
            {/* Credits display */}
            <Credits />
            
            {/* Image upload */}
            {!refImageUrl && (
          <div className="w-full max-w-md">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 flex text-sm text-gray-600">
                <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark">
                  <span>Upload an image</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        )}
        
        {/* Canvas editor */}
        {refImageUrl && !thumbnailUrl && (
          <div className="w-full">
            <div className="flex flex-col space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-center space-x-2 bg-gray-100 p-2 rounded-lg">
                <Button 
                  variant={currentTool === TOOLS.PENCIL ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTool(TOOLS.PENCIL)}
                >
                  <Pencil className="w-4 h-4 mr-1" /> Draw
                </Button>
                <Button 
                  variant={currentTool === TOOLS.TEXT ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTool(TOOLS.TEXT)}
                >
                  <TypeIcon className="w-4 h-4 mr-1" /> Text
                </Button>
                <Button 
                  variant={currentTool === TOOLS.ARROW ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTool(TOOLS.ARROW)}
                >
                  <ArrowRight className="w-4 h-4 mr-1" /> Arrow
                </Button>
                <Button 
                  variant={currentTool === TOOLS.RECT ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTool(TOOLS.RECT)}
                >
                  <Square className="w-4 h-4 mr-1" /> Shape
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                >
                  <Eraser className="w-4 h-4 mr-1" /> Clear
                </Button>
                
                {/* Color picker */}
                <div className="flex items-center space-x-2">
                  <label className="text-xs">Color:</label>
                  <input 
                    type="color" 
                    value={currentStrokeColor}
                    onChange={(e) => setCurrentStrokeColor(e.target.value)}
                    className="w-6 h-6 border-0"
                  />
                </div>
                
                {/* Fill color for shapes */}
                {currentTool === TOOLS.RECT && (
                  <div className="flex items-center space-x-2">
                    <label className="text-xs">Fill:</label>
                    <input 
                      type="color" 
                      value={currentFillColor}
                      onChange={(e) => setCurrentFillColor(e.target.value)}
                      className="w-6 h-6 border-0"
                    />
                  </div>
                )}
                
                {/* Size slider */}
                <div className="flex items-center space-x-2">
                  <label className="text-xs">Size:</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
                
                {/* Font size for text */}
                {currentTool === TOOLS.TEXT && (
                  <div className="flex items-center space-x-2">
                    <label className="text-xs">Font:</label>
                    <input 
                      type="range" 
                      min="12" 
                      max="72" 
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
              
              {/* Canvas */}
              <div className="border rounded-lg overflow-hidden mx-auto" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
                <Stage 
                  width={CANVAS_WIDTH} 
                  height={CANVAS_HEIGHT}
                  ref={stageRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <Layer>
                    {/* Background image */}
                    {imgObj && (
                      <KonvaImage
                        image={imgObj}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                      />
                    )}
                    
                    {/* Rectangles */}
                    {rectangles.map((rect) => (
                      <Rect
                        key={rect.id}
                        x={rect.x}
                        y={rect.y}
                        width={rect.width}
                        height={rect.height}
                        fill={rect.fill}
                        opacity={0.5}
                      />
                    ))}
                    
                    {/* Lines */}
                    {lines.map((line) => (
                      <Line
                        key={line.id}
                        points={line.points}
                        stroke={currentStrokeColor}
                        strokeWidth={strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                      />
                    ))}
                    
                    {/* Current line being drawn */}
                    {currentLine && (
                      <Line
                        points={currentLine}
                        stroke={currentStrokeColor}
                        strokeWidth={strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                      />
                    )}
                    
                    {/* Arrows */}
                    {arrows.map((arrow) => (
                      <Arrow
                        key={arrow.id}
                        points={arrow.points}
                        pointerLength={10}
                        pointerWidth={10}
                        fill={arrow.stroke}
                        stroke={arrow.stroke}
                        strokeWidth={arrow.strokeWidth}
                      />
                    ))}
                    
                    {/* Current arrow preview */}
                    {arrowStart && (
                      <Arrow
                        points={[
                          arrowStart[0],
                          arrowStart[1],
                          arrowStart[0] + 1, // Just to make it visible
                          arrowStart[1] + 1
                        ]}
                        pointerLength={10}
                        pointerWidth={10}
                        fill={currentStrokeColor}
                        stroke={currentStrokeColor}
                        strokeWidth={strokeWidth}
                      />
                    )}
                    
                    {/* Text elements */}
                    {texts.map((text) => (
                      <Text
                        key={text.id}
                        text={text.text}
                        x={text.x}
                        y={text.y}
                        fontSize={text.fontSize}
                        fill={text.fill}
                        draggable
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRefImageUrl(null);
                    setRefStorageId(null);
                    clearCanvas();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateThumbnail}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Generate Thumbnail"}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Result */}
        {thumbnailUrl && (
          <div className="w-full max-w-2xl">
            <div className="flex flex-col items-center space-y-4">
              <h2 className="text-xl font-semibold">Your Generated Thumbnail</h2>
              <img 
                src={thumbnailUrl} 
                alt="Generated thumbnail" 
                className="w-full h-auto rounded-lg shadow-lg"
              />
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setThumbnailUrl(null);
                    setRefImageUrl(null);
                    setRefStorageId(null);
                    clearCanvas();
                  }}
                >
                  Create New
                </Button>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = thumbnailUrl;
                    link.download = 'youtube-thumbnail.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </main>
</div>
);
}
