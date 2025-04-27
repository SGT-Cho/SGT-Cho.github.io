---
layout: single
title: "Seoul's Hidden Gem Cafés: A Weekend Tour"
categories: [Review]
tags: [Café, Seoul, Food]
author_profile: false
read_time: true
header:
  teaser: /assets/images/thumbnails/coffee.png
---

Last weekend, I took a much-needed break from my capstone project to explore some of Seoul's lesser-known cafés. After spending weeks immersed in code and academic papers, the rich aromas and ambient atmospheres of these hidden gems provided the perfect mental reset.

## Mapping the Perfect Café Crawl

I used a simple algorithm to optimize my route between five highly-rated but under-the-radar cafés in different Seoul neighborhoods. This allowed me to experience diverse coffee styles while minimizing travel time.

```python
# A simplified version of the route optimization I used
import networkx as nx
import matplotlib.pyplot as plt

# Define cafés and estimated travel times between them (in minutes)
cafes = ['Fritz Coffee', 'Moment Coffee', 'Peer Coffee', 'Greathand', 'Felt']
travel_times = {
    ('Fritz Coffee', 'Moment Coffee'): 25,
    ('Fritz Coffee', 'Peer Coffee'): 35,
    ('Fritz Coffee', 'Greathand'): 40,
    ('Fritz Coffee', 'Felt'): 45,
    ('Moment Coffee', 'Peer Coffee'): 20,
    ('Moment Coffee', 'Greathand'): 30,
    ('Moment Coffee', 'Felt'): 30,
    ('Peer Coffee', 'Greathand'): 15,
    ('Peer Coffee', 'Felt'): 25,
    ('Greathand', 'Felt'): 20
}

# Create a complete graph
G = nx.Graph()
for cafe in cafes:
    G.add_node(cafe)

# Add edges with travel times as weights
for (cafe1, cafe2), time in travel_times.items():
    G.add_edge(cafe1, cafe2, weight=time)
    G.add_edge(cafe2, cafe1, weight=time)  # Ensure bidirectional

# Find optimal route (approximation of TSP)
optimal_route = nx.approximation.traveling_salesman_problem(G, cycle=False)
print(f"Optimal café route: {' -> '.join(optimal_route)}")
```

## Fritz Coffee: The Roasting Specialists

Located in an old rice mill in Mapo-gu, Fritz Coffee has transformed a traditional space into a temple of coffee craftsmanship. The moment you step inside, the rich aroma of freshly roasted beans envelops you.

![Fritz Coffee interior](/assets/images/fritz-coffee.jpg)

I ordered their signature pour-over using Ethiopian Yirgacheffe beans. The tasting notes claimed "bergamot and honeysuckle," and surprisingly, those flavors came through clearly. The acidity was bright but not overwhelming, with a clean, tea-like finish that lingered pleasantly.

Rating: 9/10
- Coffee quality: 9.5/10
- Atmosphere: 9/10
- Price to value: 8/10

## Moment Coffee: Minimalism Meets Precision

Tucked away in a quiet alley in Yeonnam-dong, Moment Coffee embraces Japanese-inspired minimalism. The baristas work with quiet precision, treating each cup as a focused meditation.

Their cold brew was exceptional - steeped for 24 hours and served in a wine glass to enhance the aromatic experience. Notes of chocolate and cherry dominated, with zero bitterness even as it warmed to room temperature.

Rating: 8.5/10
- Coffee quality: 9/10
- Atmosphere: 8.5/10
- Price to value: 8/10

## Peer Coffee: Community and Conversation

Peer differentiates itself with its community focus. The large communal tables and open brewing bar encourage conversation between strangers - a rarity in Seoul's often private café culture.

Their signature drink, a deconstructed latte served as separate components of espresso, steamed milk, and a small milk foam art, allows you to experience the transformation as you mix them yourself.

Rating: 8/10
- Coffee quality: 8/10
- Atmosphere: 8.5/10
- Price to value: 7.5/10

> **NOTE**
> {: .notice}
> The best cafés often balance exceptional coffee with unique atmosphere. Don't just chase the perfect bean - appreciate the complete sensory experience.

## Final Thoughts: Coffee as a Break from Technology

As someone who spends most days staring at screens and code, these café experiences reminded me of the importance of analog pleasures. The tactile experience of a warm ceramic mug, the complex aromatics that no digital simulation can replicate, and the ambient sounds of espresso machines and quiet conversation provide a sensory counterpoint to digital work.

I returned to my capstone project feeling refreshed and with new perspectives. Sometimes the best debugging happens away from the keyboard, with a perfect cup of coffee in hand.