import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from '../word/word.entity';
import { User } from '../user/user.entity';
import { Sticker } from '../sticker/sticker.entity';

async function cleanupDatabase() {
  console.log('🚀 Starting database cleanup...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get repositories
    const wordRepository = app.get<Repository<Word>>(getRepositoryToken(Word));
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const stickerRepository = app.get<Repository<Sticker>>(getRepositoryToken(Sticker));

    // Count existing records
    const wordCount = await wordRepository.count();
    const userCount = await userRepository.count();
    const stickerCount = await stickerRepository.count();

    console.log('📊 Current database state:');
    console.log(`   Words: ${wordCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Stickers: ${stickerCount}`);

    if (wordCount === 0 && stickerCount === 0) {
      console.log('✅ Database is already clean - no words or stickers to remove');
      return;
    }

    // Delete all stickers first (they reference words and users)
    if (stickerCount > 0) {
      console.log('🗑️ Deleting all stickers...');
      await stickerRepository.clear();
      console.log(`✅ Deleted ${stickerCount} stickers`);
    }

    // Delete all words
    if (wordCount > 0) {
      console.log('🗑️ Deleting all words...');
      await wordRepository.clear();
      console.log(`✅ Deleted ${wordCount} words`);
    }

    // Optionally delete users (uncomment if you want to remove users too)
    // if (userCount > 0) {
    //   console.log('🗑️ Deleting all users...');
    //   await userRepository.delete({});
    //   console.log(`✅ Deleted ${userCount} users`);
    // }

    console.log('🎉 Database cleanup completed successfully!');
    console.log('📊 Final database state:');
    console.log(`   Words: ${await wordRepository.count()}`);
    console.log(`   Users: ${await userRepository.count()}`);
    console.log(`   Stickers: ${await stickerRepository.count()}`);

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the cleanup
cleanupDatabase()
  .then(() => {
    console.log('✅ Cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });