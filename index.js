const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

const colorMatchMap = {
  "black": ["red", "white", "golden yellow", "turquoise", "maroon", "silver grey"],
  "white": ["navy", "black", "fuchsia", "pink", "turquoise", "khaki", "cherry"],
  "ecru": ["maroon", "bottle green", "dusty pink", "navy", "denim blue"],
  "navy": ["white", "golden yellow", "cream", "silver grey", "baby pink"],
  "bright red": ["black", "white", "navy", "golden yellow"],
  "maroon": ["cream", "khaki", "dusty pink", "wheat", "gold", "black"],
  "red": ["cream", "khaki", "dusty pink", "wheat", "gold", "black"],
  "wheat": ["maroon", "bottle green", "dusty pink", "navy", "denim blue"],
  "cream": ["maroon", "bottle green", "dusty pink", "navy", "denim blue"],
  "bottle green": ["cream", "maroon", "golden yellow", "white"],
  "fuchsia": ["white", "grey", "navy", "silver", "dark olive"],
  "baby pink": ["grey", "white", "navy", "cherry", "purple"],
  "golden yellow": ["navy", "black", "bottle green", "cherry"],
  "silver grey": ["fuchsia", "navy", "black", "baby pink", "purple"],
  "dusty pink": ["ecru", "brown", "khaki", "maroon"],
  "khaki": ["maroon", "cream", "black", "dark olive", "golden yellow"],
  "light ink blue": ["cream", "cherry", "golden yellow"],
  "cherry": ["white", "baby pink", "cream", "bottle green"],
  "light pista": ["turquoise", "white", "dusty pink"],
  "turquoise blue": ["turquoise blue", "golden yellow", "cream", "navy blue"],
  "dark rose": ["olive green", "khaki", "cream", "ecru", "antique gold", "dusty pink", "navy blue", "turquoise blue", "dark grey"],
  "antique gold": ["maroon", "cream", "dark red", "bottle green"],
  "blue (denim)": ["cream", "maroon", "khaki", "wheat"],
  "dark olive": ["khaki", "fuchsia", "cream", "denim"],
  "brown": ["cream", "khaki", "dusty pink", "golden yellow"],
  "purple": ["grey", "white", "baby pink", "silver"]
};

app.post('/api/process-color', async (req, res) => {
  const { majorityColor, selectedLabel } = req.body;
console.log(req.body);

  if (!majorityColor || !selectedLabel) {
    return res.status(400).json({ error: 'Missing majorityColor or selectedLabel' });
  }

  // Determine the base URL using switch-case
  let baseUrl = '';
  switch (selectedLabel.toLowerCase()) {
    case 'leggings & churidar':
      baseUrl = 'https://gocolors.com/collections/leggings-churidar-1?pf_pt_product_type=Shimmer+Leggings&pf_pt_product_type=Active+Leggings&pf_pt_product_type=Ankle+Length+Leggings&pf_pt_product_type=Churidar&pf_pt_product_type=Cropped+Leggings&pf_pt_product_type=Denim+Leggings&pf_pt_product_type=Fitness+Tights&pf_pt_product_type=Ribbed+Leggings&pf_pt_product_type=Ribbed+Warm+Leggings&pf_pt_product_type=Smart+Fit+Leggings&pf_pt_product_type=Two+Tone+Side+Stripe+Active+Leggings&pf_pt_product_type=Velour+Leggings&pf_pt_product_type=Warm+Suede+Leggings&pf_pt_product_type=Yoga+Leggings';
      break;
  
    case 'wide pants':
      baseUrl = 'https://gocolors.com/collections/palazzos-pants-for-women?pf_pt_product_type=Basic+Palazzos&pf_pt_product_type=Denim+Palazzos&pf_pt_product_type=Knit+Palazzos&pf_pt_product_type=Linen+Culottes&pf_pt_product_type=Linen+Palazzos&pf_pt_product_type=Linen+Wide+Pants&pf_pt_product_type=Printed+Palazzos';
      break;
    case 'straight pants':
      baseUrl = 'https://gocolors.com/collections/active-wear-women?pf_pt_product_type=Training+Capri&pf_pt_product_type=Active+Leggings&pf_pt_product_type=Active+Shorts&pf_pt_product_type=Casual+Joggers&pf_pt_product_type=Casual+Rib+Pants&pf_pt_product_type=Cycling+Shorts&pf_pt_product_type=Fitness+Tights&pf_pt_product_type=Flared+Pants&pf_pt_product_type=Ribbed+Leggings&pf_pt_product_type=Track+Pant&pf_pt_product_type=Two+Tone+Side+Stripe+Active+Leggings&pf_pt_product_type=Yoga+Leggings';
      break;
    case 'tapered pants':
      baseUrl = 'https://gocolors.com/collections/active-wear-women?pf_pt_product_type=Training+Capri&pf_pt_product_type=Active+Leggings&pf_pt_product_type=Active+Shorts&pf_pt_product_type=Casual+Joggers&pf_pt_product_type=Casual+Rib+Pants&pf_pt_product_type=Cycling+Shorts&pf_pt_product_type=Fitness+Tights&pf_pt_product_type=Flared+Pants&pf_pt_product_type=Ribbed+Leggings&pf_pt_product_type=Track+Pant&pf_pt_product_type=Two+Tone+Side+Stripe+Active+Leggings&pf_pt_product_type=Yoga+Leggings';
      break;
    case 'jeans & jeggings':
      baseUrl = 'https://gocolors.com/collections/jeggings-collection?page=1';
      break;

      case 'Ethnic & Fusion Wear':
      baseUrl = 'https://gocolors.com/collections/formal-pants-for-women?pf_pt_product_type=Crepe+Pants&pf_pt_product_type=Chino+Pants&pf_pt_product_type=Cotton+Pencil+Pants&pf_pt_product_type=Suede+Treggings&pf_pt_product_type=Linen+Culottes&pf_pt_product_type=Denim+Culottes&pf_pt_product_type=Crepe+Wide+Pants&pf_pt_product_type=Formal+Pant&pf_pt_product_type=Ponte+Bell+Bottoms&pf_pt_product_type=Ponte+Pants';
      break;

    default:
      baseUrl = 'https://gocolors.com/collections/formal-pants-for-women?pf_pt_product_type=Crepe+Pants&pf_pt_product_type=Chino+Pants&pf_pt_product_type=Cotton+Pencil+Pants&pf_pt_product_type=Suede+Treggings&pf_pt_product_type=Linen+Culottes&pf_pt_product_type=Denim+Culottes&pf_pt_product_type=Crepe+Wide+Pants&pf_pt_product_type=Formal+Pant&pf_pt_product_type=Ponte+Bell+Bottoms&pf_pt_product_type=Ponte+Pants';
      break;
      
  }

  try {
    const response = await axios.get(baseUrl);
    console.log("the data",baseUrl);
    
    const $ = cheerio.load(response.data);
    const imageUrls = [];

    // Get matching colors and include majority color
    const matchingColors = colorMatchMap[majorityColor.toLowerCase()] || [];
    const searchColors = [majorityColor.toLowerCase(), ...matchingColors.map(c => c.toLowerCase())];
 console.log(searchColors);
 
    $('img').each((i, img) => {
      const src = $(img).attr('src');
      const alt = $(img).attr('alt') || '';
      const fullSrc = src && !src.startsWith('data:') ? (src.startsWith('http') ? src : `https:${src}`) : null;

      if (
        fullSrc &&
        searchColors.some(color =>
          fullSrc.toLowerCase().includes(color) || alt.toLowerCase().includes(color)
        )
      ) {
        imageUrls.push(fullSrc);
      }
    });

    // Generate recommendation message
    let message = `Looks great! Your ${selectedLabel} in ${majorityColor} is a perfect choice!`;
    let recommendedStyle = '';

    switch (selectedLabel.toLowerCase()) {
      case 'activewear':
        recommendedStyle = 'Pair with white sneakers for a sporty look!';
        break;
      case 'ethnic & fusion wear':
        recommendedStyle = 'Add gold accessories to enhance the look!';
        break;
      default:
        recommendedStyle = 'Try a minimalist style with neutral tones.';
        break;
    }


    console.log(imageUrls);
    

    res.status(200).json({
      message,
      recommendedStyle,
      majorityColor,
      matchedColors: searchColors,
      selectedLabel,
      matchingImages: imageUrls,
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch or process the webpage', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
