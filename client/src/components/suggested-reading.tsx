import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// Book covers data with images and info
const books = [
  {
    id: 1,
    title: "The Five Love Languages",
    author: "Gary Chapman",
    description: "Understanding how you and your partner express and experience love.",
    coverImage: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600' preserveAspectRatio='none'%3E%3Cstyle%3E.title %7B font: bold 24px sans-serif; fill: %23fff; %7D .subtitle %7B font: 18px sans-serif; fill: %23fff; %7D%3C/style%3E%3Crect width='400' height='600' fill='%23ff5e5b'/%3E%3Cpath fill='%23ff8c89' d='M0,0 L400,0 L400,600 Z'/%3E%3Ctext x='30' y='100' class='title'%3EThe Five Love Languages%3C/text%3E%3Ctext x='30' y='140' class='subtitle'%3EGary Chapman%3C/text%3E%3Cpath fill='%23fff' opacity='0.3' d='M320,300 A100,100 0 1,1 200,300 A100,100 0 1,1 320,300 Z'/%3E%3Cpath fill='%23fff' opacity='0.3' d='M250,200 A80,80 0 1,1 150,200 A80,80 0 1,1 250,200 Z'/%3E%3Cpath fill='%23fff' opacity='0.3' d='M150,400 A70,70 0 1,1 270,400 A70,70 0 1,1 150,400 Z'/%3E%3Cpath fill='%23fff' opacity='0.3' d='M300,500 A60,60 0 1,1 220,500 A60,60 0 1,1 300,500 Z'/%3E%3Cpath fill='%23fff' opacity='0.3' d='M120,100 A50,50 0 1,1 50,100 A50,50 0 1,1 120,100 Z'/%3E%3C/svg%3E",
    link: "https://www.5lovelanguages.com",
    bgColor: "bg-red-500",
  },
  {
    id: 2,
    title: "Nonviolent Communication",
    author: "Marshall Rosenberg",
    description: "A language of compassion that strengthens our ability to inspire empathy.",
    coverImage: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600' preserveAspectRatio='none'%3E%3Cstyle%3E.title %7B font: bold 24px sans-serif; fill: %23fff; %7D .subtitle %7B font: 18px sans-serif; fill: %23fff; %7D%3C/style%3E%3Crect width='400' height='600' fill='%2357a0d3'/%3E%3Cpath fill='%2388c0e8' d='M0,600 L400,0 L400,600 Z'/%3E%3Ctext x='30' y='100' class='title'%3ENonviolent Communication%3C/text%3E%3Ctext x='30' y='140' class='subtitle'%3EMarshall Rosenberg%3C/text%3E%3Cpath fill='%23fff' opacity='0.2' d='M50,300 L350,300 L350,310 L50,310 Z'/%3E%3Cpath fill='%23fff' opacity='0.2' d='M50,330 L300,330 L300,340 L50,340 Z'/%3E%3Cpath fill='%23fff' opacity='0.2' d='M50,360 L320,360 L320,370 L50,370 Z'/%3E%3Cpath fill='%23fff' opacity='0.2' d='M50,390 L290,390 L290,400 L50,400 Z'/%3E%3Cpath fill='%23fff' opacity='0.2' d='M50,420 L330,420 L330,430 L50,430 Z'/%3E%3C/svg%3E",
    link: "https://www.cnvc.org",
    bgColor: "bg-blue-500",
  },
  {
    id: 3,
    title: "Emotional Intelligence in Relationships",
    author: "John Gottman",
    description: "Building awareness of emotions to create deeper connections.",
    coverImage: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600' preserveAspectRatio='none'%3E%3Cstyle%3E.title %7B font: bold 24px sans-serif; fill: %23fff; %7D .subtitle %7B font: 18px sans-serif; fill: %23fff; %7D%3C/style%3E%3Crect width='400' height='600' fill='%237b4397'/%3E%3Cpath fill='%23dc2430' d='M400,600 L0,600 L400,0 Z'/%3E%3Ctext x='30' y='100' class='title'%3EEmotional Intelligence%3C/text%3E%3Ctext x='30' y='140' class='subtitle'%3EJohn Gottman%3C/text%3E%3Cpath fill='%23fff' opacity='0.2' d='M200,200 L210,200 A150,150 0 1,1 60,200 L200,200 Z'/%3E%3Cpath fill='%23fff' opacity='0.1' d='M230,200 L220,200 A150,150 0 1,0 370,200 L230,200 Z'/%3E%3Cpath fill='%23fff' opacity='0.3' d='M50,450 A30,30 0 1,1 80,450 A30,30 0 1,1 50,450 Z'/%3E%3Cpath fill='%23fff' opacity='0.3' d='M100,450 A25,25 0 1,1 125,450 A25,25 0 1,1 100,450 Z'/%3E%3Cpath fill='%23fff' opacity='0.3' d='M150,450 A20,20 0 1,1 170,450 A20,20 0 1,1 150,450 Z'/%3E%3C/svg%3E",
    link: "https://www.gottman.com",
    bgColor: "bg-purple-600",
  },
];

export default function SuggestedReading() {
  return (
    <div className="mt-6">
      <h3 className="font-heading font-medium text-lg text-neutral-700 dark:text-neutral-200 mb-3">Suggested Reading</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {books.map((book) => (
          <a 
            key={book.id}
            href={book.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 flex"
          >
            <div className="relative w-1/3 flex-shrink-0">
              <AspectRatio ratio={2/3} className="h-full">
                <img 
                  src={book.coverImage}
                  alt={`Cover of ${book.title}`}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="text-white w-4 h-4" />
                </div>
              </AspectRatio>
            </div>
            <div className="p-2 w-2/3">
              <h4 className="font-medium text-neutral-900 dark:text-white text-xs">{book.title}</h4>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 my-0.5">By {book.author}</div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2">{book.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
