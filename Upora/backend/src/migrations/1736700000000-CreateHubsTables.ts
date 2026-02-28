import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHubsTables1736700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create hubs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hubs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'upora_domain',
        is_public BOOLEAN NOT NULL DEFAULT false,
        logo_url TEXT,
        banner_url TEXT,
        theme_config JSONB,
        db_config JSONB,
        owner_id UUID NOT NULL REFERENCES users(id),
        created_by UUID NOT NULL REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hubs_tenant_id ON hubs(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hubs_slug ON hubs(slug)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hubs_owner_id ON hubs(owner_id)`);

    // Create hub_members table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hub_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        status VARCHAR(50) NOT NULL DEFAULT 'invited',
        invited_by UUID REFERENCES users(id),
        joined_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(hub_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_members_hub_id ON hub_members(hub_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_members_user_id ON hub_members(user_id)`);

    // Create hub_content_links table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hub_content_links (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
        lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'published',
        linked_by UUID NOT NULL REFERENCES users(id),
        released_at TIMESTAMP,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_content_links_hub_id ON hub_content_links(hub_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_content_links_lesson_id ON hub_content_links(lesson_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_content_links_course_id ON hub_content_links(course_id)`);

    // Unique partial indexes for content links (a lesson/course can only be linked once per hub)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_content_links_hub_lesson
      ON hub_content_links(hub_id, lesson_id) WHERE lesson_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_content_links_hub_course
      ON hub_content_links(hub_id, course_id) WHERE course_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hub_content_links CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS hub_members CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS hubs CASCADE`);
  }
}
