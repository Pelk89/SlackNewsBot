/**
 * Test script for RelevanceEngine
 * Tests the relevance scoring without needing Slack webhooks
 */

const RelevanceEngine = require('./src/relevance/RelevanceEngine');

// Sample test articles (with realistic word counts)
const testArticles = [
  {
    title: 'Amazon Launches New Autonomous Delivery Robot for Last Mile Logistics',
    description: 'Amazon announces breakthrough in autonomous delivery technology with new robot fleet for last mile delivery in retail environments. This marks a significant innovation in the grocery sector. The company has been testing these autonomous vehicles in multiple markets across the United States. The robots use advanced sensors and machine learning algorithms to navigate sidewalks and deliver packages directly to customers doors. This represents a major step forward in retail automation and last mile delivery efficiency. Industry experts predict this will transform how groceries and retail products are delivered in urban areas.',
    link: 'https://techcrunch.com/article-1',
    pubDate: new Date().toISOString(),
    source: 'TechCrunch'
  },
  {
    title: 'YOU WON\'T BELIEVE THIS SHOCKING RETAIL TRICK!!!',
    description: 'Click here to see what retailers don\'t want you to know! This amazing secret will change everything about how you shop. Number 7 will shock you! Doctors hate this one simple trick that saves you money at the grocery store.',
    link: 'https://spamsite.com/clickbait',
    pubDate: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days old
    source: 'Unknown Blog'
  },
  {
    title: 'Walmart Quarterly Earnings Report Shows Revenue Growth',
    description: 'Walmart reports quarterly earnings and stock price movements showing strong revenue growth in the retail sector. The company exceeded analyst expectations with earnings per share reaching new highs. Stock prices rose following the announcement as investors responded positively to the strong financial performance. The earnings report highlighted growth in both online and in-store sales channels. Commentary from analysts suggests the company is well positioned for continued growth in the retail market despite economic headwinds.',
    link: 'https://reuters.com/walmart-earnings',
    pubDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day old
    source: 'Reuters'
  },
  {
    title: 'Retail Innovation: New Grocery Automation Technology Unveiled by Major Chain',
    description: 'Leading supermarket chain introduces revolutionary warehouse automation and delivery robots for improved last mile efficiency. The new technology deployment represents one of the largest investments in retail innovation this year. The system combines automated warehouse robots with autonomous delivery vehicles to create an end-to-end solution for grocery delivery. The company plans to expand this technology across hundreds of stores in the coming months. This innovation is expected to significantly reduce delivery times and improve operational efficiency in the competitive grocery retail market.',
    link: 'https://retaildive.com/automation-news',
    pubDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours old
    source: 'Retail Dive'
  },
  {
    title: 'Top 10 Cat Facts You Need to Know Today',
    description: 'Learn about cats and their amazing abilities in this comprehensive guide. Cats have been domesticated for thousands of years and continue to be popular pets worldwide. From their unique hunting behaviors to their social dynamics, cats are fascinating creatures. This article explores the most interesting facts about feline behavior and biology that every cat owner should understand.',
    link: 'https://randomsite.com/cats',
    pubDate: new Date().toISOString(),
    source: 'Random Site'
  },
  {
    title: 'Autonomous Vehicles Transform Retail Supply Chain Operations',
    description: 'New autonomous delivery vehicles are disrupting the retail supply chain with breakthrough technology for last mile delivery. Major retailers are investing billions in autonomous vehicle technology to improve delivery efficiency and reduce costs. The vehicles use advanced sensors lidar and artificial intelligence to navigate complex urban environments safely. Pilot programs have shown significant improvements in delivery speed and customer satisfaction. Industry analysts predict autonomous delivery will become mainstream in retail within the next five years as technology continues to advance.',
    link: 'https://supplychaindive.com/av-retail',
    pubDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours old
    source: 'Supply Chain Dive'
  }
];

async function testRelevanceEngine() {
  console.log('🧪 Testing RelevanceEngine\n');
  console.log('=' .repeat(80));

  try {
    // Initialize engine
    const engine = new RelevanceEngine();

    // Process articles
    const filtered = await engine.scoreAndFilter(testArticles);

    // Show results
    console.log('\n\n📊 FINAL RESULTS\n');
    console.log('=' .repeat(80));

    if (filtered.length === 0) {
      console.log('❌ No articles passed the filters!');
      return;
    }

    filtered.forEach((article, i) => {
      console.log(`\n${i + 1}. SCORE: ${(article.relevance.score * 100).toFixed(1)}%`);
      console.log(`   Title: ${article.title.substring(0, 70)}...`);
      console.log(`   Source: ${article.source}`);
      console.log(`   Reasoning: ${article.relevance.metadata.reasoning}`);
      console.log(`   Breakdown:`);
      console.log(`     - Thematic: ${(article.relevance.breakdown.thematic * 100).toFixed(0)}%`);
      console.log(`     - Authority: ${(article.relevance.breakdown.authority * 100).toFixed(0)}%`);
      console.log(`     - Timeliness: ${(article.relevance.breakdown.timeliness * 100).toFixed(0)}%`);
      console.log(`     - Innovation: ${(article.relevance.breakdown.innovation * 100).toFixed(0)}%`);
    });

    // Statistics
    console.log('\n\n📈 STATISTICS\n');
    console.log('=' .repeat(80));
    const stats = engine.getFilteringStats(testArticles, filtered);
    console.log(`Original articles: ${stats.originalCount}`);
    console.log(`Filtered articles: ${stats.filteredCount}`);
    console.log(`Removed: ${stats.removedCount}`);
    console.log(`Filter rate: ${stats.filterRate}`);
    console.log(`Average score: ${stats.averageScore}`);
    console.log(`Top score: ${stats.topScore}`);

    console.log('\n\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testRelevanceEngine();
