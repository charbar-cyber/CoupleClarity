import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function StyleGuide() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">CoupleClarity Style Guide</h1>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Color Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ColorSwatch name="Primary (Soft Blue)" hex="#4A90E2" className="bg-primary-blue text-white" />
          <ColorSwatch name="Accent (Coral Rose)" hex="#F67280" className="bg-accent-coral text-white" />
          <ColorSwatch name="Surface (Slate Gray)" hex="#2F3542" className="bg-surface text-white" />
          <ColorSwatch name="Light Bg (Neutral Cream)" hex="#FAFAFA" className="bg-palette-lightBg text-palette-darkText border" />
          <ColorSwatch name="Dark Bg" hex="#0D0D0D" className="bg-palette-darkBg text-palette-lightText" />
          <ColorSwatch name="Light Text" hex="#F1F1F1" className="bg-palette-darkBg text-palette-lightText" />
          <ColorSwatch name="Dark Text" hex="#1C1C1C" className="bg-palette-lightBg text-palette-darkText border" />
        </div>
      </section>
      
      <Separator className="my-8" />
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Typography</h2>
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold">Heading 1</h1>
            <p className="text-sm text-muted-foreground">4xl - Used for main page headings</p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Heading 2</h2>
            <p className="text-sm text-muted-foreground">3xl - Used for section headings</p>
          </div>
          <div>
            <h3 className="text-2xl font-medium">Heading 3</h3>
            <p className="text-sm text-muted-foreground">2xl - Used for card titles and subsections</p>
          </div>
          <div>
            <h4 className="text-xl font-medium">Heading 4</h4>
            <p className="text-sm text-muted-foreground">xl - Used for minor headings</p>
          </div>
          <div>
            <p className="text-base">Body text - The quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-muted-foreground">base - Primary body text</p>
          </div>
          <div>
            <p className="text-sm">Small text - The quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-muted-foreground">sm - Used for secondary information</p>
          </div>
        </div>
      </section>
      
      <Separator className="my-8" />
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Primary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="link">Link Button</Button>
          <Button variant="destructive">Destructive</Button>
          <Button className="couple-btn-primary">Custom Primary</Button>
          <Button className="couple-btn-accent">Custom Accent</Button>
        </div>
      </section>
      
      <Separator className="my-8" />
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Standard card component</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is the content of a standard card component.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="mr-2">Cancel</Button>
              <Button>Action</Button>
            </CardFooter>
          </Card>
          
          <div className="couple-card">
            <h3 className="text-xl font-semibold mb-2">Custom Card</h3>
            <p className="text-muted-foreground text-sm mb-4">Using our custom card style</p>
            <p className="mb-4">Content area for important information.</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" className="mr-2">Cancel</Button>
              <Button className="couple-btn-primary">Submit</Button>
            </div>
          </div>
          
          <div className="couple-card-accent">
            <h3 className="text-xl font-semibold mb-2">Accent Card</h3>
            <p className="text-accent-foreground/80 text-sm mb-4">Card with accent styling</p>
            <p className="mb-4">Used for emphasis or important forms.</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" className="border-white text-white hover:text-white mr-2">Cancel</Button>
              <Button className="couple-btn-accent">Continue</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface ColorSwatchProps {
  name: string;
  hex: string;
  className?: string;
}

function ColorSwatch({ name, hex, className }: ColorSwatchProps) {
  return (
    <div className="flex flex-col">
      <div className={`h-24 rounded-md flex items-end p-3 ${className}`}>
        <div className="font-mono text-xs">{hex}</div>
      </div>
      <p className="mt-2 text-sm font-medium">{name}</p>
    </div>
  );
}

export default StyleGuide;