"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  Mic,
  Video,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function CreateMeetingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadMethod, setUploadMethod] = useState<
    "text" | "audio" | "video" | "txt"
  >("text");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Plain text form
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");

  // File upload form
  const [fileTitle, setFileTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleBack = () => {
    router.push("/meetings");
  };

  const resetForm = () => {
    setTitle("");
    setTranscript("");
    setFileTitle("");
    setSelectedFile(null);
    setUploadError("");
    setUploadSuccess(false);
    setUploadStage("");
  };

  const handlePlainTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transcript.trim()) {
      setUploadError("Please enter a transcript");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadStage("Creating meeting...");

    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim() || "Plain Text Meeting",
          transcript: transcript.trim(),
          time: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create meeting");
      }

      setUploadSuccess(true);
      setUploadStage("");

      setTimeout(() => {
        router.push(`/meetings/${data.meeting.id}`);
      }, 1500);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to create meeting",
      );
      setUploadStage("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError("");
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadError("Please select a file");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadStage("Uploading file...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", fileTitle.trim() || selectedFile.name);

      const response = await fetch("/api/meetings/from-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      setUploadStage("Processing complete!");
      setUploadSuccess(true);

      setTimeout(() => {
        router.push(`/meetings/${data.meeting.id}`);
      }, 1500);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload file",
      );
      setUploadStage("");
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = () => {
    switch (uploadMethod) {
      case "audio":
        return <Mic className="h-8 w-8" />;
      case "video":
        return <Video className="h-8 w-8" />;
      case "txt":
        return <FileText className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  const getAcceptTypes = () => {
    switch (uploadMethod) {
      case "audio":
        return "audio/*";
      case "video":
        return "video/*";
      case "txt":
        return ".txt,text/plain";
      default:
        return "";
    }
  };

  const getPlaceholder = () => {
    switch (uploadMethod) {
      case "audio":
        return "Upload audio file (MP3, WAV, M4A, etc.)";
      case "video":
        return "Upload video file (MP4, WebM, MOV, etc.)";
      case "txt":
        return "Upload text file (.txt)";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Create <span className="text-primary">Meeting</span>
            </h1>
            <p className="text-muted-foreground">
              Upload your meeting content to generate AI-powered insights
            </p>
          </div>
        </div>

        {/* Upload Method Tabs */}
        <Tabs
          value={uploadMethod}
          onValueChange={(value: string) => {
            setUploadMethod(value as "text" | "audio" | "video" | "txt");
            resetForm();
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text" className="gap-2">
              <FileText className="h-4 w-4" />
              Plain Text
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2">
              <Mic className="h-4 w-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-2">
              <Video className="h-4 w-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="txt" className="gap-2">
              <Upload className="h-4 w-4" />
              Text File
            </TabsTrigger>
          </TabsList>

          {/* Plain Text Tab */}
          <TabsContent value="text" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Paste Transcript
                </CardTitle>
                <CardDescription>
                  Paste your meeting transcript directly as plain text
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePlainTextSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-title">Meeting Title (Optional)</Label>
                    <Input
                      id="text-title"
                      placeholder="e.g., Weekly Team Standup"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transcript">Transcript *</Label>
                    <Textarea
                      id="transcript"
                      placeholder="Paste your meeting transcript here..."
                      className="min-h-[300px]"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={isUploading || !transcript.trim()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploadStage || "Creating meeting..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Create Meeting
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* File Upload Tabs (Audio, Video, TXT) */}
          <TabsContent value="audio" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Upload Audio
                </CardTitle>
                <CardDescription>
                  Upload an audio recording of your meeting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadForm
                  uploadMethod={uploadMethod}
                  fileTitle={fileTitle}
                  setFileTitle={setFileTitle}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onSubmit={handleFileUpload}
                  isUploading={isUploading}
                  uploadStage={uploadStage}
                  getFileIcon={getFileIcon}
                  getAcceptTypes={getAcceptTypes}
                  getPlaceholder={getPlaceholder}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Upload Video
                </CardTitle>
                <CardDescription>
                  Upload a video recording of your meeting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadForm
                  uploadMethod={uploadMethod}
                  fileTitle={fileTitle}
                  setFileTitle={setFileTitle}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onSubmit={handleFileUpload}
                  isUploading={isUploading}
                  uploadStage={uploadStage}
                  getFileIcon={getFileIcon}
                  getAcceptTypes={getAcceptTypes}
                  getPlaceholder={getPlaceholder}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="txt" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Text File
                </CardTitle>
                <CardDescription>
                  Upload a text file containing your meeting transcript
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadForm
                  uploadMethod={uploadMethod}
                  fileTitle={fileTitle}
                  setFileTitle={setFileTitle}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onSubmit={handleFileUpload}
                  isUploading={isUploading}
                  uploadStage={uploadStage}
                  getFileIcon={getFileIcon}
                  getAcceptTypes={getAcceptTypes}
                  getPlaceholder={getPlaceholder}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Messages */}
        {uploadError && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Upload failed</p>
                <p className="text-sm text-muted-foreground">{uploadError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {uploadSuccess && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Success!</p>
                <p className="text-sm text-muted-foreground">
                  Meeting created successfully. Redirecting...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FileUploadForm({
  uploadMethod,
  fileTitle,
  setFileTitle,
  selectedFile,
  onFileSelect,
  onSubmit,
  isUploading,
  uploadStage,
  getFileIcon,
  getAcceptTypes,
  getPlaceholder,
}: {
  uploadMethod: string;
  fileTitle: string;
  setFileTitle: (value: string) => void;
  selectedFile: File | null;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isUploading: boolean;
  uploadStage: string;
  getFileIcon: () => React.ReactNode;
  getAcceptTypes: () => string;
  getPlaceholder: () => string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file-title">Meeting Title (Optional)</Label>
        <Input
          id="file-title"
          placeholder="e.g., Weekly Team Standup"
          value={fileTitle}
          onChange={(e) => setFileTitle(e.target.value)}
          disabled={isUploading}
        />
      </div>

      <div className="space-y-2">
        <Label>File *</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptTypes()}
          className="hidden"
          onChange={onFileSelect}
          disabled={isUploading}
        />
        <div
          onClick={handleUploadClick}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            selectedFile
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-primary/50 hover:bg-muted/50"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <div className="flex justify-center text-primary">
                {getFileIcon()}
              </div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-center text-muted-foreground">
                {getFileIcon()}
              </div>
              <p className="text-sm text-muted-foreground">
                {getPlaceholder()}
              </p>
              <Button type="button" variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={isUploading || !selectedFile}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {uploadStage || "Uploading..."}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Upload & Process
          </>
        )}
      </Button>
    </form>
  );
}
