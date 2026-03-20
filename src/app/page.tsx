import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Music, Camera, Mic2, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-2xl font-bold text-violet-700">Bukarrum</span>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 py-24">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
          Online booking for<br />
          <span className="text-violet-700">creative studios</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Give your clients a seamless booking experience. Manage rooms, availability, and payments — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/signup">
              Start for free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/book/demo">See a demo</Link>
          </Button>
        </div>
      </section>

      {/* Studio types */}
      <section className="max-w-4xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Mic2, title: "Recording Studios", desc: "Manage session rooms, equipment, and engineer schedules." },
          { icon: Music, title: "Rehearsal Spaces", desc: "Let bands book practice rooms by the hour, online 24/7." },
          { icon: Camera, title: "Photo Studios", desc: "Showcase your sets and let photographers reserve instantly." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center mb-4">
              <Icon className="h-5 w-5 text-violet-700" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
