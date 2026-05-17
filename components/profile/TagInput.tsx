'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  maxLength?: number
  placeholder?: string
}

export function TagInput({
  tags,
  onChange,
  maxTags = 20,
  maxLength = 200,
  placeholder,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) return
    if (tags.length >= maxTags) return
    onChange([...tags, trimmed])
    setInputValue('')
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addTag}
          disabled={!inputValue.trim() || tags.length >= maxTags}
        >
          追加
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 pr-1 text-manavi-navy bg-manavi-bg border-manavi-border"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="rounded-full p-0.5 hover:bg-manavi-border transition-colors"
                aria-label={`${tag} を削除`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
