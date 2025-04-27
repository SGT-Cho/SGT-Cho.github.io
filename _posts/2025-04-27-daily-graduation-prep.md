---
layout: single
title: "Counting Down to Graduation: The Final Projects"
categories: [Life]
tags: [Campus, Diary, Senior Year]
author_profile: false
read_time: true
header:
  teaser: /assets/images/thumbnails/daily.png
---

It's hard to believe I'm only a few months away from graduating. The campus feels different now that I'm approaching the end of my academic journey at Incheon National University. Today, I spent most of my time in the AI lab, working on final adjustments for my capstone project.

## Morning Routine Changed

My usual morning routine has transformed dramatically over the past few weeks. Instead of casually enjoying breakfast while scrolling through social media, I now find myself reviewing research papers and checking implementation details before even leaving my apartment.

```python
# Quick morning check of my model's overnight training results
import pandas as pd
import matplotlib.pyplot as plt

# Load the training logs
logs = pd.read_csv('training_logs.csv')

# Visualize training and validation loss
plt.figure(figsize=(10, 5))
plt.plot(logs['epoch'], logs['train_loss'], label='Training Loss')
plt.plot(logs['epoch'], logs['val_loss'], label='Validation Loss')
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()
plt.title('Model Training Progress')
plt.savefig('training_progress.png')
plt.show()
```

The training results from last night looked promising. The validation loss has been steadily decreasing, which is a good sign that the model isn't overfitting. I'm hoping to achieve at least a 90% accuracy rate before the final presentation.

## Campus Life in the Final Stretch

The atmosphere around campus has changed as many of us seniors are focused on completing our final projects. The library is constantly full, and the computer labs are occupied almost 24/7. It's both stressful and exciting to see everyone working so diligently toward their goals.

Today, I met with Professor Kim to discuss the final aspects of my LLM project. He suggested some modifications to the RAG implementation that could significantly improve performance:

1. Improving the chunking strategy for better context retrieval
2. Implementing a hybrid search approach combining semantic and keyword search
3. Adding a relevance filtering mechanism before passing context to the model

These changes will require another week of work, but they should make the demo much more impressive for the final presentation.

![Campus library during exam season](/assets/images/library-busy.jpg)

The campus library at 11 PM - still packed with students. This has become my second home these days.

## Balancing Act: Projects and Job Applications

While working on the capstone project, I'm also sending out job applications. Finding the right balance is challenging, but I'm managing by allocating specific time blocks for each task. Mornings are for research and implementation, afternoons for debugging and testing, and evenings for preparing applications and portfolios.

I received a positive response from a tech company I applied to last week. They were particularly interested in my experience with fine-tuning LLMs and implementing RAG systems. The interview is scheduled for next Monday, which gives me enough time to prepare.

> **NOTE**
> {: .notice}
> Never underestimate the power of a well-documented project in your portfolio. The code might be impressive, but clear documentation shows you understand the bigger picture.

## Looking Ahead

With graduation approaching in August, I'm both excited and nervous about what comes next. The AI field is constantly evolving, and staying relevant requires continuous learning. I've already planned my post-graduation learning path, focusing on advanced LLM techniques, multimodal models, and more robust evaluation methods.

For now, though, my focus is on finishing strong. Tomorrow will be another full day in the lab, fine-tuning parameters and implementing Professor Kim's suggestions. One day at a time, getting closer to both the end and a new beginning.