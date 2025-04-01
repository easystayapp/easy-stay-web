"use client";

import React, { useEffect, useState } from "react";
import VideoFeed from "./components/VideoFeed";

export default function Home() {
  const [videos, setVideos] = useState<[Iprop]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // const data = await apiClient.getVideos();
        setVideos([]);
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    };

    fetchVideos();
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">ImageKit ReelsPro</h1>
      <VideoFeed videos={videos} />
    </main>
  );
}
