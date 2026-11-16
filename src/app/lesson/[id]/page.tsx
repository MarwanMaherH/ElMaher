import { notFound } from "next/navigation";
import { LessonPlayer } from "../../../features/academy/LessonPlayer";
import { LESSONS, lessonById } from "../../../features/academy/content/lessons";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = lessonById(id);
  if (!lesson) notFound();
  return <LessonPlayer lesson={lesson} />;
}
