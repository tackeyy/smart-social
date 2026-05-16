-- style_profiles.x_account_id に UNIQUE 制約を追加
-- (テーブルが制約なしで作成済みだったため別途追加)
ALTER TABLE style_profiles ADD CONSTRAINT uq_style_profiles_x_account UNIQUE (x_account_id);
