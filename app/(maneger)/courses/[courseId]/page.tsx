'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { addVideoToCourse, getCourseById } from '@/app/actions/course';
import { notFound } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import VideoUploader from '@/components/S3VideoUpload';
import { toast } from 'sonner';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Clock, User, Calendar, Tag, Loader2, Plus, ArrowLeft } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

const VIDEO_THUMBNAIL = '/videoThumbnail.jpg';

interface Video {
  _id: string;
  title: string;
  description: string;
  url: string;
  duration: string;
}

interface Instructor {
  name: string;
}

interface Course {
  _id: string;
  name: string;
  description: string;
  instructor: Instructor;
  thumbnail: string | null;
  tags: string[];
  videos: Video[];
  created_at: string;
  updated_at: string;
}

const getCourseDetails = async (courseId: string) => {
  const result = await getCourseById(courseId);
  if (result.error) return null;
  if (result.data) return JSON.parse(result?.data);
  return null;
};

const CourseDetails = () => {
  const pathName = usePathname();
  const courseId = pathName.split('/')[2];
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [newVideo, setNewVideo] = useState<Video | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      const courseData = await getCourseDetails(courseId);
      if (courseData) {
        setCourse(courseData);
      } else {
        notFound();
      }
    };
    fetchCourse();
  }, [courseId]);

  const handleVideoUploadComplete = (mongoId: string) => {
    setVideoDuration(videoDuration);
    setNewVideo(prevState => ({
      ...prevState!,
      url: `${process.env.NEXT_PUBLIC_S3_BASE_URL}/hls/${mongoId}/${mongoId}.m3u8`,
      _id: mongoId,
      duration: "0"
    }));
    toast.success('Video uploaded successfully!');
  };

  const handleAddVideo = async () => {
    if (!newVideo || !videoTitle || !newVideo.url) {
      toast.error('Please fill all fields before adding a video.');
      return;
    }

    const video = {
      ...newVideo,
      title: videoTitle,
      description: videoDescription,
      duration: videoDuration,
    };

    setLoading(true);

    try {
      const result = await addVideoToCourse(courseId, video);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const updatedCourse = {
        ...course!,
        videos: [...course!.videos, video],
      };
      setCourse(updatedCourse);

      setVideoTitle('');
      setVideoDescription('');
      setNewVideo(null);
      setIsDialogOpen(false);
      toast.success('Video added successfully!');
    } catch (error) {
      toast.error('Error adding video to course.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!course) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-2/3">
              <h1 className="text-4xl font-bold mb-4">{course.name}</h1>
              <p className="text-lg text-gray-600 mb-6">{course.description}</p>
              
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  <span className="text-gray-700">{course.instructor.name}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  <span className="text-gray-700">
                    Updated {new Date(course.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center">
                  <PlayCircle className="w-5 h-5 mr-2 text-blue-600" />
                  <span className="text-gray-700">{course.videos.length} videos</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="md:w-1/3">
              {course.thumbnail && course.thumbnail !== '/courseThumbnail.jpg' ? (
                <Image
                  src={course.thumbnail}
                  alt={course.name}
                  width={400}
                  height={225}
                  className="rounded-xl shadow-lg object-cover w-full"
                />
              ) : (
                <div className="bg-gray-100 rounded-xl w-full aspect-video flex items-center justify-center">
                  <PlayCircle className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Videos Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Course Content</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add New Video
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add a New Video</DialogTitle>
                <DialogDescription>
                  Fill in the details of the new video you want to add to this course.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <label htmlFor="videoTitle" className="text-sm font-medium">
                    Video Title
                  </label>
                  <Input
                    id="videoTitle"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Enter video title"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="videoDescription" className="text-sm font-medium">
                    Video Description
                  </label>
                  <Textarea
                    id="videoDescription"
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Enter video description"
                    className="w-full"
                    rows={4}
                  />
                </div>
                <VideoUploader onSuccess={handleVideoUploadComplete} />
              </div>
              <DialogFooter>
                <Button onClick={handleAddVideo} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Adding...' : 'Add Video'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {course.videos.length === 0 ? (
          <Card className="text-center py-16 bg-white">
            <CardContent>
              <PlayCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first video to this course.</p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Video
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Add a New Video</DialogTitle>
                    <DialogDescription>
                      Fill in the details of the new video you want to add to this course.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <label htmlFor="videoTitle" className="text-sm font-medium">
                        Video Title
                      </label>
                      <Input
                        id="videoTitle"
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        placeholder="Enter video title"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="videoDescription" className="text-sm font-medium">
                        Video Description
                      </label>
                      <Textarea
                        id="videoDescription"
                        value={videoDescription}
                        onChange={(e) => setVideoDescription(e.target.value)}
                        placeholder="Enter video description"
                        className="w-full"
                        rows={4}
                      />
                    </div>
                    <VideoUploader onSuccess={handleVideoUploadComplete} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddVideo} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {loading ? 'Adding...' : 'Add Video'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {course.videos.map((video) => (
                <Card
                  key={video._id}
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer bg-white"
                  onClick={() => router.push(`/courses/${course._id}/${video._id}`)}
                >
                  <div className="relative aspect-video">
                    <Image
                      src={VIDEO_THUMBNAIL}
                      alt={video.title}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <PlayCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {video.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;